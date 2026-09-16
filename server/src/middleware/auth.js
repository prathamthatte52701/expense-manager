const crypto = require('crypto');
const { accessToken } = require('../config');

function timingSafeMatch(token, expected) {
  const a = Buffer.from(String(token || ''));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ponytail: in-memory fixed-window limiter, single-process only — swap for a
// shared store (Redis) if this ever runs behind multiple instances.
const FAILED_AUTH_LIMIT = 20; // requests
const FAILED_AUTH_WINDOW_MS = 60 * 1000;
const failedAuthHits = new Map();

function auth(req, res, next) {
  if (!accessToken) return res.status(500).json({ message: 'ACCESS_TOKEN is not configured on the server.' });

  const token = req.header('x-app-token');
  if (token && timingSafeMatch(token, accessToken)) return next();

  // Only failed attempts consume the budget — a correct token always passes above.
  const key = req.ip;
  const now = Date.now();
  const windowStart = now - FAILED_AUTH_WINDOW_MS;
  const hits = (failedAuthHits.get(key) || []).filter((t) => t > windowStart);
  if (hits.length >= FAILED_AUTH_LIMIT) {
    return res.status(429).json({ message: 'Too many failed authentication attempts. Wait a minute and try again.' });
  }
  hits.push(now);
  failedAuthHits.set(key, hits);
  return res.status(401).json({ message: 'Invalid or missing access token.' });
}

module.exports = auth;
