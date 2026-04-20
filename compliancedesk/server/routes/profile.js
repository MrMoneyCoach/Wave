import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

const ALLOWED_NETWORKS = ['sjp', 'quilter', 'openwork', 'sesame', 'independent'];

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();
    if (error) throw error;
    res.json({ profile: data });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const update = {
      id: req.user.id,
      email: req.user.email,
    };

    if (body.network !== undefined) {
      if (!ALLOWED_NETWORKS.includes(body.network)) {
        return res.status(400).json({ error: 'Unknown network' });
      }
      update.network = body.network;
    }
    if (body.adviser_name !== undefined) update.adviser_name = body.adviser_name;
    if (body.firm_name !== undefined) update.firm_name = body.firm_name;
    if (body.firm_fca_number !== undefined) update.firm_fca_number = body.firm_fca_number;
    if (body.default_ongoing_charge !== undefined) update.default_ongoing_charge = body.default_ongoing_charge;
    if (body.default_initial_charge !== undefined) update.default_initial_charge = body.default_initial_charge;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(update, { onConflict: 'id' })
      .select('*')
      .single();
    if (error) throw error;
    res.json({ profile: data });
  } catch (err) {
    next(err);
  }
});

export default router;
