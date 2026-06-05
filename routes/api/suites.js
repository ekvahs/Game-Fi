const express = require('express');
const { check } = require('express-validator');
const { getSuites, getSuiteById, createSuite } = require('../../controllers/suites');

const router = express.Router();

router.get('/', getSuites);
router.get('/:id', getSuiteById);
router.post(
  '/',
  [
    check('suiteName', 'Suite name is required').not().isEmpty(),
    check('suiteName', 'Suite name must be at least 2 characters').isLength({ min: 2 }),
  ],
  createSuite,
);

module.exports = router;
