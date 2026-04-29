const express = require('express');
const { z } = require('zod');
const { store, nextId } = require('../data/store');
const { authRequired } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

const createSchema = z.object({
  user_name: z.string().min(1, 'Le nom de l\'emprunteur est requis').max(200),
  book_id: z.number().int().positive(),
});

// Toutes les routes emprunts sont protégées
router.use(authRequired);

router.get('/', (req, res) => {
  // Emprunts en cours = returned_at === null
  const list = store.borrows.filter((b) => b.returned_at === null);
  res.json({ success: true, data: list, message: 'Emprunts en cours' });
});

router.post('/', validate(createSchema), (req, res) => {
  const { user_name, book_id } = req.validated;
  const book = store.books.find((b) => b.id === book_id);
  if (!book) {
    return res.status(422).json({
      success: false,
      message: 'Validation échouée',
      errors: { book_id: ['Livre inexistant.'] },
    });
  }
  if (!book.available) {
    return res.status(422).json({
      success: false,
      message: 'Validation échouée',
      errors: { book_id: ['Ce livre n\'est pas disponible.'] },
    });
  }
  const borrow = {
    id: nextId('borrow'),
    user_name,
    book_id,
    borrowed_at: new Date().toISOString(),
    returned_at: null,
  };
  store.borrows.push(borrow);
  book.available = false;
  res.status(201).json({ success: true, data: borrow, message: 'Emprunt enregistré' });
});

router.patch('/:id/return', (req, res) => {
  const id = Number(req.params.id);
  const borrow = store.borrows.find((b) => b.id === id);
  if (!borrow) return res.status(404).json({ success: false, message: 'Emprunt introuvable' });
  if (borrow.returned_at) {
    return res.status(422).json({
      success: false,
      message: 'Validation échouée',
      errors: { returned_at: ['Ce livre a déjà été rendu.'] },
    });
  }
  borrow.returned_at = new Date().toISOString();
  const book = store.books.find((b) => b.id === borrow.book_id);
  if (book) book.available = true;
  res.json({ success: true, data: borrow, message: 'Livre rendu' });
});

module.exports = router;
