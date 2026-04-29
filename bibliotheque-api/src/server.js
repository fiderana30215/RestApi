try { require('dotenv').config(); } catch (e) { /* dotenv optionnel */ }
const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const { seed } = require('./data/seed');
const authRoutes = require('./routes/auth');
const authorRoutes = require('./routes/authors');
const bookRoutes = require('./routes/books');
const borrowRoutes = require('./routes/borrows');

const app = express();
app.use(cors());
app.use(express.json());

// Seed initial
seed();

// Swagger UI
const openapiPath = path.join(__dirname, '..', 'openapi.yaml');
const swaggerDocument = YAML.load(openapiPath);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'API Bibliothèque — Docs',
}));
app.get('/api/documentation', (req, res) => res.redirect('/api/docs'));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/authors', authorRoutes);
app.use('/api/v1/books', bookRoutes);
app.use('/api/v1/borrows', borrowRoutes);

// Health
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Bibliothèque — voir /api/docs pour la documentation Swagger',
    data: { docs: '/api/docs', base: '/api/v1' },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Erreur serveur', errors: { server: [err.message] } });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 API Bibliothèque sur http://localhost:${PORT}`);
  console.log(`📘 Swagger UI    : http://localhost:${PORT}/api/docs`);
});
