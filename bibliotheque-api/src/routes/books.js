const express = require('express');
const { z } = require('zod');
const { store, nextId } = require('../data/store');
const { authRequired } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

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

router.get('/', (req, res) => {
  let list = store.books;
  if (req.query.available !== undefined) {
    const flag = String(req.query.available).toLowerCase() === 'true';
    list = list.filter((b) => b.available === flag);
  }
  res.json({
    success: true,
    data: list.map(expand),
    message: 'Liste des livres',
  });
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
  const book = { id: nextId('book'), available: true, ...data };
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

module.exports = router;
