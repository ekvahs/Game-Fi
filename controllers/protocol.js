const platform = require('../utils/platform');
const { getChainStatus } = require('../utils/chain');
const { asyncHandler, AppError } = require('../utils/errors');
const { HTTP_STATUS } = require('../utils/constants');

const actorId = (req) => req.user?.id;

const getDashboard = asyncHandler(async (req, res) => {
  const data = platform.dashboard(actorId(req));
  const chain = await getChainStatus();
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { ...data, chain },
  });
});

const listCatalog = asyncHandler(async (req, res) => {
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: platform.listCatalog({
      q: req.query.q,
      modelType: req.query.modelType,
      listed: req.query.listed,
    }),
  });
});

const listLots = asyncHandler(async (req, res) => {
  return res.status(HTTP_STATUS.OK).json({ success: true, data: platform.listLots() });
});

const getLot = asyncHandler(async (req, res) => {
  return res.status(HTTP_STATUS.OK).json({ success: true, data: platform.getLot(req.params.id) });
});

const createLot = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    modelType,
    imageUrl,
    priceHub,
    tags,
    licenseMode,
    version,
    seats,
    monthlyInferences,
    commercialUse,
    royaltyBps,
    inferencePriceHub,
    parameters,
    contextWindow,
  } = req.body || {};
  const data = platform.createLot({
    userId: actorId(req),
    title,
    description,
    modelType,
    imageUrl,
    priceHub,
    tags,
    licenseMode,
    version,
    seats,
    monthlyInferences,
    commercialUse,
    royaltyBps,
    inferencePriceHub,
    parameters,
    contextWindow,
  });
  return res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

const listListings = asyncHandler(async (req, res) => {
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: platform.listListings({ status: req.query.status }),
  });
});

const createListing = asyncHandler(async (req, res) => {
  const listing = platform.createListing({
    userId: actorId(req),
    lotId: req.body?.lotId,
    priceHub: req.body?.priceHub,
    licenseId: req.body?.licenseId,
  });
  return res.status(HTTP_STATUS.CREATED).json({ success: true, data: listing });
});

const listStakes = asyncHandler(async (req, res) => {
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: platform.listStakes(actorId(req)),
  });
});

const createStake = asyncHandler(async (req, res) => {
  const stake = platform.createStake({
    userId: actorId(req),
    pool: req.body?.pool,
    amountHub: req.body?.amountHub,
  });
  return res.status(HTTP_STATUS.CREATED).json({ success: true, data: stake });
});

const collectStake = asyncHandler(async (req, res) => {
  const stake = platform.collectStake({
    userId: actorId(req),
    stakeId: req.params.id,
  });
  return res.status(HTTP_STATUS.OK).json({ success: true, data: stake });
});

const listOrders = asyncHandler(async (req, res) => {
  return res.status(HTTP_STATUS.OK).json({ success: true, data: platform.listOrders(actorId(req)) });
});

const createOrder = asyncHandler(async (req, res) => {
  const data = platform.createOrder({
    userId: actorId(req),
    listingId: req.body?.listingId,
    flow: req.body?.flow,
  });
  return res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

const listOffers = asyncHandler(async (req, res) => {
  return res.status(HTTP_STATUS.OK).json({ success: true, data: platform.listOffers(actorId(req)) });
});

const createOffer = asyncHandler(async (req, res) => {
  const offer = platform.createOffer({
    userId: actorId(req),
    listingId: req.body?.listingId,
    amountHub: req.body?.amountHub,
    note: req.body?.note,
  });
  return res.status(HTTP_STATUS.CREATED).json({ success: true, data: offer });
});

const acceptOffer = asyncHandler(async (req, res) => {
  const data = platform.acceptOffer({
    userId: actorId(req),
    offerId: req.params.id,
  });
  return res.status(HTTP_STATUS.OK).json({ success: true, data });
});

const listTransactions = asyncHandler(async (req, res) => {
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: platform.listTransactions(),
  });
});

const listPools = asyncHandler(async (req, res) => {
  return res.status(HTTP_STATUS.OK).json({ success: true, data: platform.listPools() });
});

const listLicenses = asyncHandler(async (req, res) => {
  return res.status(HTTP_STATUS.OK).json({ success: true, data: platform.listLicenses(actorId(req)) });
});

const useLicense = asyncHandler(async (req, res) => {
  const data = platform.useLicense({
    userId: actorId(req),
    licenseId: req.params.id,
    units: req.body?.units,
  });
  return res.status(HTTP_STATUS.OK).json({ success: true, data });
});

const cancelListing = asyncHandler(async (req, res) => {
  const data = platform.cancelListing({
    userId: actorId(req),
    listingId: req.params.id,
  });
  return res.status(HTTP_STATUS.OK).json({ success: true, data });
});

const getWallet = asyncHandler(async (req, res) => {
  return res.status(HTTP_STATUS.OK).json({ success: true, data: platform.getWallet(actorId(req)) });
});

const faucet = asyncHandler(async (req, res) => {
  return res.status(HTTP_STATUS.OK).json({ success: true, data: platform.faucet(actorId(req)) });
});

const walletLedger = asyncHandler(async (req, res) => {
  return res.status(HTTP_STATUS.OK).json({ success: true, data: platform.listWalletLedger(actorId(req)) });
});

const listNotifications = asyncHandler(async (req, res) => {
  return res.status(HTTP_STATUS.OK).json({ success: true, data: platform.listNotifications(actorId(req)) });
});

module.exports = {
  getDashboard,
  listCatalog,
  listLots,
  getLot,
  createLot,
  listListings,
  createListing,
  listStakes,
  createStake,
  collectStake,
  listOrders,
  createOrder,
  listOffers,
  createOffer,
  acceptOffer,
  listTransactions,
  listPools,
  listLicenses,
  useLicense,
  cancelListing,
  getWallet,
  faucet,
  walletLedger,
  listNotifications,
  AppError,
};
