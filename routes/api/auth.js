const express = require('express');
const { check } = require('express-validator');
const { requireAuth } = require('../../middleware/auth');
const { login, getCurrentUser } = require('../../controllers/auth');

const router = express.Router();

router.get('/', requireAuth, getCurrentUser);

router.post(
  '/',
  [
    check('password', 'Password is required').exists(),
  ],
  login,
);

module.exports = router;
