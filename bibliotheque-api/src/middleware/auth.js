const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Non authentifié — token manquant' });
  }
  try {
    const secret = process.env.JWT_SECRET || 'dev_secret';
    req.user = jwt.verify(token, secret);
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
}

module.exports = { authRequired };
