const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { store } = require('../data/store');
const { validate } = require('../middleware/validate');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

router.post('/login', validate(loginSchema), (req, res) => {
  const { email, password } = req.validated;
  const user = store.users.find((u) => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Identifiants invalides' });
  }
  const secret = process.env.JWT_SECRET || 'dev_secret';
  const token = jwt.sign({ sub: user.id, email: user.email }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
  return res.status(200).json({
    success: true,
    data: { token, user: { id: user.id, email: user.email, name: user.name } },
    message: 'Authentification réussie',
  });
});

module.exports = router;
