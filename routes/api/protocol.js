const express = require('express');
const protocol = require('../../controllers/protocol');
const { requireAuth, optionalAuth } = require('../../middleware/auth');

const router = express.Router();

router.get('/dashboard', optionalAuth, protocol.getDashboard);
router.get('/catalog', protocol.listCatalog);
router.get('/pools', protocol.listPools);

router.get('/lots', protocol.listLots);
router.get('/lots/:id', protocol.getLot);
router.post('/lots', requireAuth, protocol.createLot);

router.get('/listings', protocol.listListings);
router.post('/listings', requireAuth, protocol.createListing);
router.post('/listings/:id/cancel', requireAuth, protocol.cancelListing);

router.get('/licenses', optionalAuth, protocol.listLicenses);
router.post('/licenses/:id/use', requireAuth, protocol.useLicense);

router.get('/stakes', optionalAuth, protocol.listStakes);
router.post('/stakes', requireAuth, protocol.createStake);
router.post('/stakes/:id/collect', requireAuth, protocol.collectStake);

router.get('/orders', optionalAuth, protocol.listOrders);
router.post('/orders', requireAuth, protocol.createOrder);

router.get('/offers', optionalAuth, protocol.listOffers);
router.post('/offers', requireAuth, protocol.createOffer);
router.post('/offers/:id/accept', requireAuth, protocol.acceptOffer);

router.get('/transactions', optionalAuth, protocol.listTransactions);
router.get('/notifications', requireAuth, protocol.listNotifications);

module.exports = router;
