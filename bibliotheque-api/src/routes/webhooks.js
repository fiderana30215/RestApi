const express = require('express');
const crypto = require('crypto'); // module natif Node.js — pas besoin d'installer
const { store } = require('../data/store');

const router = express.Router();

/**
 * Vérifie la signature Stripe-Signature avec HMAC-SHA256
 * Stripe envoie : t=timestamp,v1=signature dans l'en-tête Stripe-Signature
 *
 * @param {Buffer} rawBody  - corps brut de la requête (Buffer)
 * @param {string} sigHeader - valeur de l'en-tête Stripe-Signature
 * @param {string} secret   - STRIPE_WEBHOOK_SECRET du .env
 * @returns {boolean}
 */
function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader || !secret) return false;

  // Format : t=1234567890,v1=abcdef...
  const parts = {};
  sigHeader.split(',').forEach((part) => {
    const [key, val] = part.split('=');
    parts[key] = val;
  });

  if (!parts.t || !parts.v1) return false;

  // Stripe signe : timestamp + '.' + rawBody
  const signedPayload = `${parts.t}.${rawBody.toString('utf8')}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Comparaison sécurisée (évite timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(parts.v1, 'hex')
  );
}

/**
 * POST /api/v1/webhooks/stripe
 * Reçoit les événements Stripe (payment_intent.succeeded, etc.)
 *
 * IMPORTANT : ce endpoint n'a PAS de BearerAuth JWT
 * L'authentification se fait par vérification de signature HMAC
 *
 * IMPORTANT : express.raw() est nécessaire pour que rawBody soit un Buffer
 * (express.json() consomme le body et empêche la vérification de signature)
 */
router.post('/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const sigHeader = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Vérification de la signature
  let valid = false;
  try {
    valid = verifyStripeSignature(req.body, sigHeader, webhookSecret);
  } catch (err) {
    // timingSafeEqual peut lever une erreur si les buffers ont des tailles différentes
    valid = false;
  }

  if (!valid) {
    return res.status(401).json({
      success: false,
      message: 'Signature Stripe invalide ou absente',
    });
  }

  // Parser le body (qui est un Buffer à ce stade)
  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch (e) {
    return res.status(400).json({ success: false, message: 'Corps webhook invalide' });
  }

  // Traitement selon le type d'événement
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data?.object;
      const userId = Number(intent?.metadata?.user_id);

      if (userId) {
        const user = store.users.find((u) => u.id === userId);
        if (user) {
          user.subscription_status = 'premium';
          console.log(`✅ Webhook Stripe : user ${userId} (${user.email}) → premium`);
        } else {
          console.warn(`⚠️  Webhook Stripe : user_id=${userId} introuvable`);
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data?.object;
      console.warn(`❌ Paiement échoué pour PaymentIntent ${intent?.id}`);
      break;
    }

    default:
      console.log(`ℹ️  Webhook Stripe reçu (non traité) : ${event.type}`);
  }

  // Stripe attend TOUJOURS un 200 rapidement, sinon il réessaie
  res.json({ received: true });
});

module.exports = router;