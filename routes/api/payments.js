const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { createIntent, verifyPayment } = require('../../controllers/payments');

const router = express.Router();

router.post('/intent', requireAuth, createIntent);
router.post('/verify', requireAuth, verifyPayment);

module.exports = router;
