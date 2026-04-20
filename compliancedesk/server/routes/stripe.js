import express from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-09-30.acacia',
});

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

router.post('/checkout', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from('profiles')
        .upsert({ id: userId, email, stripe_customer_id: customerId }, { onConflict: 'id' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${CLIENT_URL}/dashboard?upgrade=success`,
      cancel_url: `${CLIENT_URL}/dashboard?upgrade=cancelled`,
      allow_promotion_codes: true,
      client_reference_id: userId,
      metadata: { supabase_user_id: userId },
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

router.post('/portal', requireAuth, async (req, res, next) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', req.user.id)
      .maybeSingle();
    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer on file' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${CLIENT_URL}/settings`,
    });
    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// Mounted in index.js BEFORE express.json so the raw body is preserved.
export async function stripeWebhookHandler(req, res) {
  const signature = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, secret);
  } catch (err) {
    console.error('[stripe webhook] signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.supabase_user_id;
        if (userId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await supabaseAdmin.from('profiles').update({
            stripe_customer_id: session.customer,
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            subscription_current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          }).eq('id', userId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customerId = sub.customer;
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status;
        await supabaseAdmin.from('profiles').update({
          stripe_subscription_id: sub.id,
          subscription_status: status,
          subscription_current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        }).eq('stripe_customer_id', customerId);
        break;
      }
      default:
        // ignore other events
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[stripe webhook] handler error', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

export default router;
