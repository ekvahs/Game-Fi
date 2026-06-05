const platform = require('../utils/platform');
const { createPaymentIntent, verifyChainPayment } = require('../utils/payments');
const { asyncHandler } = require('../utils/errors');
const { HTTP_STATUS } = require('../utils/constants');

const createIntent = asyncHandler(async (req, res) => {
  const { listingId, modelId, amount, asset, buyer } = req.body || {};

  if (listingId && req.user?.id) {
    const data = platform.createOrder({
      userId: req.user.id,
      listingId,
      flow: 'take',
    });
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Paid from HUB ledger. On-chain crypto checkout remains a further feature.',
      data: {
        settlement: 'hub_ledger',
        ...data,
      },
    });
  }

  const stub = await createPaymentIntent({ modelId, amount, asset, buyer });
  return res.status(HTTP_STATUS.OK).json({
    success: false,
    message: stub.message,
    data: stub,
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const data = await verifyChainPayment(req.body || {});
  return res.status(HTTP_STATUS.OK).json({
    success: false,
    message: data.message,
    data,
  });
});

module.exports = {
  createIntent,
  verifyPayment,
};
