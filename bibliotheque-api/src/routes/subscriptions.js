const express = require('express');
const https = require('https');
const { store } = require('../data/store');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function stripeRequest(path, body) {
  return new Promise((resolve, reject) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return reject(new Error('STRIPE_SECRET_KEY manquant dans .env'));

    const params = new URLSearchParams(body).toString();
    const options = {
      hostname: 'api.stripe.com', port: 443, path, method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(params),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Réponse Stripe non parseable')); }
      });
    });
    req.on('error', (e) => reject(e));
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout Stripe')); });
    req.write(params);
    req.end();
  });
}

router.post('/payment-intent', async (req, res) => {
  const user = store.users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
  if (user.subscription_status === 'premium') {
    return res.status(422).json({ success: false, message: 'Vous avez déjà un abonnement premium.' });
  }

  let intent;
  try {
    intent = await stripeRequest('/v1/payment_intents', {
      amount: '500', currency: 'eur',
      'metadata[user_id]': String(user.id),
      'metadata[plan]': 'premium',
    });
  } catch (err) {
    return res.status(503).json({
      success: false, message: 'Service Stripe indisponible',
      errors: { stripe: [err.message] },
    });
  }

  if (intent.error) {
    return res.status(422).json({
      success: false, message: 'Erreur Stripe',
      errors: { stripe: [intent.error.message] },
    });
  }

  res.json({
    success: true,
    data: {
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
    },
    message: 'PaymentIntent créé',
  });
});

router.get('/status', (req, res) => {
  const user = store.users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
  res.json({
    success: true,
    data: {
      user_id: user.id, email: user.email,
      subscription_status: user.subscription_status || 'free',
      borrow_limit: user.subscription_status === 'premium' ? null : 2,
    },
    message: 'Statut abonnement',
  });
});

module.exports = router;