const express = require('express');
const { check } = require('express-validator');
const { optionalAuth, requireAuth } = require('../../middleware/auth');
const { getModels, getModelById, createModel } = require('../../controllers/models');

const router = express.Router();

router.get('/', getModels);
router.get('/:id', getModelById);
router.post(
  '/',
  requireAuth,
  [
    check('title', 'Model title is required').not().isEmpty(),
    check('title', 'Model title must be at least 2 characters').isLength({ min: 2 }),
  ],
  createModel,
);

module.exports = router;
module.exports.optionalAuth = optionalAuth;
