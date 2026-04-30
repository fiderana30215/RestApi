const express = require('express');
const { z } = require('zod');
const { store, nextId } = require('../data/store');
const { authRequired } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { generateSummary, extractKeywords } = require('../services/openai');

const router = express.Router();

const isbnRegex = /^[0-9\-]{10,17}$/;

const createSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200),
  isbn: z.string().regex(isbnRegex, 'ISBN invalide'),
  year: z.number().int().min(0).max(new Date().getFullYear() + 1),
  available: z.boolean().optional().default(true),
  author_id: z.number().int().positive(),
});
const updateSchema = createSchema.partial();

function expand(book) {
  const author = store.authors.find((a) => a.id === book.author_id) || null;
  return { ...book, author };
}

// ─── Endpoints existants (Séance 3) ───────────────────────────────────────────

router.get('/', (req, res) => {
  let list = store.books;
  if (req.query.available !== undefined) {
    const flag = String(req.query.available).toLowerCase() === 'true';
    list = list.filter((b) => b.available === flag);
  }
  res.json({ success: true, data: list.map(expand), message: 'Liste des livres' });
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const book = store.books.find((b) => b.id === id);
  if (!book) return res.status(404).json({ success: false, message: 'Livre introuvable' });
  res.json({ success: true, data: expand(book), message: 'Détails du livre' });
});

router.post('/', authRequired, validate(createSchema), (req, res) => {
  const data = req.validated;
  if (store.books.some((b) => b.isbn === data.isbn)) {
    return res.status(422).json({
      success: false,
      message: 'Validation échouée',
      errors: { isbn: ['Cet ISBN existe déjà.'] },
    });
  }
  if (!store.authors.some((a) => a.id === data.author_id)) {
    return res.status(422).json({
      success: false,
      message: 'Validation échouée',
      errors: { author_id: ['Auteur inexistant.'] },
    });
  }
  const book = { id: nextId('book'), available: true, summary: null, ...data };
  store.books.push(book);
  res.status(201).json({ success: true, data: expand(book), message: 'Livre créé' });
});

router.put('/:id', authRequired, validate(updateSchema), (req, res) => {
  const id = Number(req.params.id);
  const book = store.books.find((b) => b.id === id);
  if (!book) return res.status(404).json({ success: false, message: 'Livre introuvable' });
  const data = req.validated;
  if (data.isbn && store.books.some((b) => b.isbn === data.isbn && b.id !== id)) {
    return res.status(422).json({
      success: false,
      message: 'Validation échouée',
      errors: { isbn: ['Cet ISBN existe déjà.'] },
    });
  }
  Object.assign(book, data);
  res.json({ success: true, data: expand(book), message: 'Livre modifié' });
});

router.delete('/:id', authRequired, (req, res) => {
  const id = Number(req.params.id);
  const idx = store.books.findIndex((b) => b.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Livre introuvable' });
  store.books.splice(idx, 1);
  res.status(204).send();
});

// ─── NOUVEAUX endpoints Séance 6 — OpenAI ────────────────────────────────────

/**
 * POST /api/v1/books/smart-search
 * Recherche par description naturelle via OpenAI
 * IMPORTANT: cette route doit être déclarée AVANT /:id pour éviter le conflit
 */
router.post('/smart-search', async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(422).json({
      success: false,
      message: 'Validation échouée',
      errors: { query: ['La requête de recherche est requise.'] },
    });
  }

  let keywords;
  try {
    keywords = await extractKeywords(query.trim());
  } catch (err) {
    const status = err.message.includes('Timeout') || err.message.includes('indisponible') ? 503 : 503;
    return res.status(status).json({
      success: false,
      message: 'Service IA indisponible — réessayez plus tard',
      errors: { openai: [err.message] },
    });
  }

  // Recherche dans la BDD avec les mots-clés extraits
  const lower = (s) => (s || '').toLowerCase();
  const results = store.books.filter((book) => {
    const author = store.authors.find((a) => a.id === book.author_id);
    const searchable = [
      book.title,
      book.isbn,
      String(book.year),
      author?.first_name,
      author?.last_name,
      author?.nationality,
    ].map(lower).join(' ');

    return keywords.some((kw) => searchable.includes(lower(kw)));
  });

  res.json({
    success: true,
    query: query.trim(),
    keywords,
    data: results.map(expand),
    message: `${results.length} livre(s) trouvé(s)`,
  });
});

/**
 * GET /api/v1/books/:id/summary
 * Retourne le résumé existant du livre (pas d'appel OpenAI)
 */
router.get('/:id/summary', (req, res) => {
  const id = Number(req.params.id);
  const book = store.books.find((b) => b.id === id);
  if (!book) return res.status(404).json({ success: false, message: 'Livre introuvable' });

  if (!book.summary) {
    return res.status(404).json({
      success: false,
      message: 'Aucun résumé disponible pour ce livre. Utilisez POST /books/:id/summary pour en générer un.',
    });
  }

  res.json({
    success: true,
    data: {
      book_id: book.id,
      title: book.title,
      summary: book.summary,
      generated_by: book.summary_model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      generated_at: book.summary_generated_at || null,
    },
    message: 'Résumé du livre',
  });
});

/**
 * POST /api/v1/books/:id/summary
 * Génère et sauvegarde un résumé via OpenAI (JWT requis)
 */
router.post('/:id/summary', authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const book = store.books.find((b) => b.id === id);
  if (!book) return res.status(404).json({ success: false, message: 'Livre introuvable' });

  const author = store.authors.find((a) => a.id === book.author_id);

  // Ne pas régénérer si un résumé existe déjà
  if (book.summary) {
    return res.json({
      success: true,
      data: {
        book_id: book.id,
        title: book.title,
        summary: book.summary,
        generated_by: book.summary_model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
        generated_at: book.summary_generated_at || null,
      },
      message: 'Résumé existant retourné (pas de nouvel appel API)',
    });
  }

  // Appel OpenAI
  let summary;
  try {
    summary = await generateSummary(
      book.title,
      author?.first_name || 'Auteur',
      author?.last_name || 'Inconnu',
      book.year
    );
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: 'Service IA indisponible — réessayez plus tard',
      errors: { openai: [err.message] },
    });
  }

  // Sauvegarde dans le store
  book.summary = summary;
  book.summary_model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  book.summary_generated_at = new Date().toISOString();

  res.json({
    success: true,
    data: {
      book_id: book.id,
      title: book.title,
      summary: book.summary,
      generated_by: book.summary_model,
      generated_at: book.summary_generated_at,
    },
    message: 'Résumé généré et sauvegardé',
  });
});

module.exports = router;