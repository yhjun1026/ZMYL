const jwt = require('jsonwebtoken');
const config = require('../config');

function signToken(userId, role, extra = {}) {
  const payload = { userId, role, ...extra };
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    return null;
  }
}

module.exports = { signToken, verifyToken };