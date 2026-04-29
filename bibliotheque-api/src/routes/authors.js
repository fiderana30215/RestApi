const express = require('express');
const { z } = require('zod');
const { store, nextId } = require('../data/store');
const { authRequired } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

const createSchema = z.object({
  first_name: z.string().min(1, 'Le prénom est requis').max(100),
  last_name: z.string().min(1, 'Le nom est requis').max(100),
  nationality: z.string().min(1, 'La nationalité est requise').max(100),
});
const updateSchema = createSchema.partial();

router.get('/', (req, res) => {
  res.json({ success: true, data: store.authors, message: 'Liste des auteurs' });
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const author = store.authors.find((a) => a.id === id);
  if (!author) return res.status(404).json({ success: false, message: 'Auteur introuvable' });
  const books = store.books.filter((b) => b.author_id === id);
  res.json({ success: true, data: { ...author, books }, message: 'Détails de l\'auteur' });
});

router.post('/', authRequired, validate(createSchema), (req, res) => {
  const author = { id: nextId('author'), ...req.validated };
  store.authors.push(author);
  res.status(201).json({ success: true, data: author, message: 'Auteur créé' });
});

router.put('/:id', authRequired, validate(updateSchema), (req, res) => {
  const id = Number(req.params.id);
  const author = store.authors.find((a) => a.id === id);
  if (!author) return res.status(404).json({ success: false, message: 'Auteur introuvable' });
  Object.assign(author, req.validated);
  res.json({ success: true, data: author, message: 'Auteur modifié' });
});

router.delete('/:id', authRequired, (req, res) => {
  const id = Number(req.params.id);
  const idx = store.authors.findIndex((a) => a.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Auteur introuvable' });
  store.authors.splice(idx, 1);
  res.status(204).send();
});

module.exports = router;
