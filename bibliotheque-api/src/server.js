try { require('dotenv').config(); } catch (e) { /* dotenv optionnel */ }
const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const { seed } = require('./data/seed');
const authRoutes        = require('./routes/auth');
const authorRoutes      = require('./routes/authors');
const bookRoutes        = require('./routes/books');
const borrowRoutes      = require('./routes/borrows');
const subscriptionRoutes = require('./routes/subscriptions'); // NOUVEAU
const webhookRoutes     = require('./routes/webhooks');       // NOUVEAU

const app = express();
app.use(cors());

// ⚠️  IMPORTANT : le webhook Stripe a besoin du body brut (Buffer)
// express.raw() est appliqué uniquement sur /api/v1/webhooks/stripe (dans webhooks.js)
// express.json() est appliqué sur tout le reste
app.use((req, res, next) => {
  if (req.path === '/api/v1/webhooks/stripe') {
    next(); // le middleware express.raw() est dans webhooks.js
  } else {
    express.json()(req, res, next);
  }
});

// Seed initial
seed();

// Swagger UI
const openapiPath = path.join(__dirname, '..', 'openapi.yaml');
const swaggerDocument = YAML.load(openapiPath);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'API Bibliothèque — Docs',
}));
app.get('/api/documentation', (req, res) => res.redirect('/api/docs'));

// ─── Routes Séance 3 (inchangées) ────────────────────────────────────────────
app.use('/api/v1/auth',    authRoutes);
app.use('/api/v1/authors', authorRoutes);
app.use('/api/v1/books',   bookRoutes);
app.use('/api/v1/borrows', borrowRoutes);

// ─── Routes Séance 6 (nouvelles) ─────────────────────────────────────────────
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/webhooks',      webhookRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Bibliothèque — voir /api/docs pour la documentation Swagger',
    data: { docs: '/api/docs', base: '/api/v1' },
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Erreur serveur',
    errors: { server: [err.message] },
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 API Bibliothèque sur http://localhost:${PORT}`);
  console.log(`📘 Swagger UI    : http://localhost:${PORT}/api/docs`);
  console.log(`🤖 OpenAI model  : ${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`);
  console.log(`💳 Stripe mode   : ${process.env.STRIPE_SECRET_KEY ? 'configuré' : '⚠️  STRIPE_SECRET_KEY manquant'}`);
});