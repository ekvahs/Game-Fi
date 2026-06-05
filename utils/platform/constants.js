const TREASURY_ID = 'usr_treasury';

const POOLS = {
  'Language Bond': { key: 'language', aprBps: 800, minHub: 25, description: 'Underwrite language-model inference and listings.' },
  'Vision Bond': { key: 'vision', aprBps: 650, minHub: 25, description: 'Reserve against vision inference runs and license demand.' },
  'Audio Bond': { key: 'audio', aprBps: 720, minHub: 25, description: 'Bond yield tied to live audio node demand.' },
  'Multimodal Bond': { key: 'multimodal', aprBps: 900, minHub: 50, description: 'Higher APR for mixed-modality underwriting.' },
};

const PROTOCOL = {
  FEE_BPS: 250,
  ROYALTY_BPS: 500,
  OFFER_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,
  FAUCET_AMOUNT: 5000,
  FAUCET_COOLDOWN_MS: 6 * 60 * 60 * 1000,
  SIGNUP_GRANT: 100000,
  LICENSE_TERM_DAYS: 365,
  YIELD_YEAR_MS: 365.25 * 24 * 60 * 60 * 1000,
  LIST_BOND_HUB: 25,
};

const DEMO_PASSWORD = 'demo1234';

module.exports = {
  TREASURY_ID,
  POOLS,
  PROTOCOL,
  DEMO_PASSWORD,
};
