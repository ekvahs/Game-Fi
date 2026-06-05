const jwt = require('jsonwebtoken');
const config = require('../config');
const { AuthenticationError } = require('../utils/errors');
const { sendError } = require('../utils/response');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

const jwtSecret = () => config.JWT_SECRET || 'demo-secret-key-change-in-production';

const readToken = (req) => {
  const header = req.header('x-auth-token') || req.header('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return header || '';
};

const attachUser = (req, decoded) => {
  req.user = decoded.user || decoded;
};

const optionalAuth = (req, res, next) => {
  const token = readToken(req);
  if (!token) return next();
  jwt.verify(token, jwtSecret(), (err, decoded) => {
    if (!err && decoded) attachUser(req, decoded);
    next();
  });
};

const requireAuth = (req, res, next) => {
  try {
    const token = readToken(req);
    if (!token) {
      return sendError(res, ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    jwt.verify(token, jwtSecret(), (err, decoded) => {
      if (err) {
        return sendError(res, ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
      }
      attachUser(req, decoded);
      next();
    });
  } catch (err) {
    console.error('Token validation error:', err);
    return sendError(res, ERROR_MESSAGES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

const validateToken = requireAuth;

module.exports = validateToken;
module.exports.requireAuth = requireAuth;
module.exports.optionalAuth = optionalAuth;
module.exports.AuthenticationError = AuthenticationError;
