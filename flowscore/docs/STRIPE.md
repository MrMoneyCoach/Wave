# Stripe billing setup

Flowscore uses Stripe Checkout + Customer Portal for subscription billing.
This file is the operator's checklist for getting it live in a deployment.
The application code falls back to a `mailto:billing@flowscore.app` flow when
Stripe env vars aren't set, so it's safe to deploy first and wire Stripe up
incrementally.

## 1 — Create products in Stripe

In Stripe Dashboard → **Products** → New product, create three products that
match the tiers Flowscore exposes:

| Product   | Monthly price | Annual price (20% off) |
| --------- | ------------- | ---------------------- |
| Starter   | £19           | £182.40 (≈ £15.20/mo)  |
| Grow      | £49           | £470.40 (≈ £39.20/mo)  |
| Pro       | £99           | £950.40 (≈ £79.20/mo)  |

For each product add **two prices**: one recurring monthly, one recurring
yearly. After saving, copy the price IDs (they look like `price_1Q...`).

The **Free** tier has no Stripe price (it's the default state). The
**Unlimited** tier is sales-only — no Stripe product needed.

## 2 — Set environment variables

Add these in Vercel → Settings → Environment Variables for production
(and preview if you want to test on preview deploys):

```
STRIPE_SECRET_KEY=sk_live_...           # or sk_test_... while testing
STRIPE_WEBHOOK_SECRET=whsec_...         # from step 4 below

STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_GROW_MONTHLY=price_...
STRIPE_PRICE_GROW_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
```

Make sure `APP_URL` is also set to your deployed URL (e.g.
`https://flowscore.app`). Stripe Checkout uses it for the success/cancel
redirects.

## 3 — Configure the customer portal

In Stripe Dashboard → **Settings → Billing → Customer portal**:

- Allow customers to update their billing information.
- Allow plan changes between Starter / Grow / Pro (both monthly and annual
  prices for each).
- Allow cancellation (recommend "at end of billing period").
- Save.

## 4 — Add the webhook

In Stripe Dashboard → **Developers → Webhooks** → Add endpoint:

- URL: `https://your-domain/api/billing/webhook`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Copy the **signing secret** that Stripe gives you (`whsec_…`) into
`STRIPE_WEBHOOK_SECRET` in Vercel. Redeploy.

## 5 — Test in test mode

Use Stripe test mode (toggle top-right of the dashboard). Add the test mode
keys + price IDs to your **Preview** environment in Vercel.

Stripe's test card numbers:

- `4242 4242 4242 4242` — succeeds
- `4000 0000 0000 9995` — declined
- Any future expiry date and any 3-digit CVC will work.

To verify the webhook end-to-end, run `stripe listen --forward-to
http://localhost:3000/api/billing/webhook` while developing locally; Stripe
will replay events with a `whsec_` secret printed to your terminal.

## What the code does

- `POST /api/billing/checkout` — creates a Stripe Checkout session for the
  caller's chosen tier+cycle, persists the new `stripeCustomerId` on the
  user row on first run, and returns the Checkout URL for the client to
  redirect to.
- `POST /api/billing/portal` — creates a Stripe Customer Portal session for
  the current user.
- `POST /api/billing/webhook` — verifies the Stripe signature, then for
  subscription / invoice events syncs the User row: `tier`,
  `subscriptionCycle`, `stripeSubscriptionStatus`, `currentPeriodEnd`. Maps
  Stripe price IDs back to tiers using the env vars above. Cancelled or
  past-due subscriptions drop the user back to the Free tier.
