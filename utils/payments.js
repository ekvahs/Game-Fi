/**
 * Crypto payment contract for MarketHub.
 * Live wallet, chain RPC, and settlement are a further feature.
 */
const PAYMENT_NOT_IMPLEMENTED = {
  status: 'not_implemented',
  feature: 'crypto_checkout',
  message: 'Crypto payment integration is a further feature.',
  supportedLater: ['HUB', 'ETH', 'USDT'],
};

const createPaymentIntent = async ({ modelId, amount, asset, buyer }) => {
  return {
    ...PAYMENT_NOT_IMPLEMENTED,
    modelId: modelId || null,
    amount: amount || null,
    asset: asset || 'HUB',
    buyer: buyer || null,
  };
};

const verifyChainPayment = async () => {
  return {
    ...PAYMENT_NOT_IMPLEMENTED,
    verified: false,
  };
};

module.exports = {
  PAYMENT_NOT_IMPLEMENTED,
  createPaymentIntent,
  verifyChainPayment,
};
