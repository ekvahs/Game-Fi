const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const protocol = require('../../controllers/protocol');

const router = express.Router();

router.get('/', requireAuth, protocol.getWallet);
router.post('/faucet', requireAuth, protocol.faucet);
router.get('/ledger', requireAuth, protocol.walletLedger);

module.exports = router;
