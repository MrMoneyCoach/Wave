import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { buildUserPrompt, getSystemPromptForNetwork } from '../prompts/index.js';

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FREE_TIER_LIMIT = 3;
const MODEL_ID = 'claude-sonnet-4-20250514';

async function loadProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function countLetters(userId) {
  const { count, error } = await supabaseAdmin
    .from('letters')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count || 0;
}

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await loadProfile(userId);
    if (!profile) {
      return res.status(400).json({ error: 'Profile not found. Please complete sign up.' });
    }

    const isPaid = profile.subscription_status === 'active' || profile.subscription_status === 'trialing';
    if (!isPaid) {
      const used = await countLetters(userId);
      if (used >= FREE_TIER_LIMIT) {
        return res.status(402).json({
          error: 'Free tier limit reached',
          code: 'UPGRADE_REQUIRED',
          used,
          limit: FREE_TIER_LIMIT,
        });
      }
    }

    const formData = req.body || {};
    if (!formData.clientName) {
      return res.status(400).json({ error: 'clientName is required' });
    }

    const systemPrompt = getSystemPromptForNetwork(profile.network);
    const userPrompt = buildUserPrompt(formData, profile);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const send = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    let fullText = '';

    try {
      const stream = await anthropic.messages.stream({
        model: MODEL_ID,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      stream.on('text', (textDelta) => {
        fullText += textDelta;
        send('delta', { text: textDelta });
      });

      await stream.finalMessage();

      const { data: saved, error: saveError } = await supabaseAdmin
        .from('letters')
        .insert({
          user_id: userId,
          client_name: formData.clientName,
          product_type: formData.productType || null,
          network: profile.network,
          form_data: formData,
          letter_text: fullText,
        })
        .select('id, created_at')
        .single();

      if (saveError) {
        console.error('[generate] save failed', saveError);
        send('warning', { message: 'Letter generated but failed to save to history' });
      } else {
        send('saved', { id: saved.id, created_at: saved.created_at });
      }

      send('done', { wordCount: fullText.trim().split(/\s+/).length });
      res.end();
    } catch (streamError) {
      console.error('[generate] stream error', streamError);
      send('error', { message: streamError.message || 'Generation failed' });
      res.end();
    }
  } catch (err) {
    next(err);
  }
});

export default router;
