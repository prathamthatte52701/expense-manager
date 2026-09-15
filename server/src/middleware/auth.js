const { accessToken } = require('../config');

function auth(req, res, next) {
  const token = req.header('x-app-token');
  if (!accessToken) return res.status(500).json({ message: 'ACCESS_TOKEN is not configured on the server.' });
  if (token !== accessToken) return res.status(401).json({ message: 'Invalid or missing access token.' });
  return next();
}

module.exports = auth;
