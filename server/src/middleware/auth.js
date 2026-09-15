const crypto = require('crypto');
const { accessToken } = require('../config');

function timingSafeMatch(token, expected) {
  const a = Buffer.from(String(token || ''));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function auth(req, res, next) {
  const token = req.header('x-app-token');
  if (!accessToken) return res.status(500).json({ message: 'ACCESS_TOKEN is not configured on the server.' });
  if (!token || !timingSafeMatch(token, accessToken)) return res.status(401).json({ message: 'Invalid or missing access token.' });
  return next();
}

module.exports = auth;
