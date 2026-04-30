const express = require('express');
const crypto = require('crypto');
const { store } = require('../data/store');

const router = express.Router();

function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader || !secret) return false;
  const parts = {};
  sigHeader.split(',').forEach((part) => {
    const [key, val] = part.split('=');
    parts[key] = val;
  });
  if (!parts.t || !parts.v1) return false;
  const signedPayload = `${parts.t}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(parts.v1, 'hex'));
  } catch (e) {
    return false;
  }
}

router.post('/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const sigHeader    = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!verifyStripeSignature(req.body, sigHeader, webhookSecret)) {
    return res.status(401).json({ success: false, message: 'Signature Stripe invalide ou absente' });
  }

  let event;
  try { event = JSON.parse(req.body.toString('utf8')); }
  catch (e) { return res.status(400).json({ success: false, message: 'Corps webhook invalide' }); }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data?.object;
    const userId = Number(intent?.metadata?.user_id);
    if (userId) {
      const user = store.users.find((u) => u.id === userId);
      if (user) {
        user.subscription_status = 'premium';
        console.log(`✅ Webhook Stripe : user ${userId} → premium`);
      }
    }
  }

  res.json({ received: true });
});

module.exports = router;