const POOL_BY_TYPE = {
  Language: 'Language Bond',
  Vision: 'Vision Bond',
  Audio: 'Audio Bond',
  Multimodal: 'Multimodal Bond',
};

const attachModelTerms = (lot = {}, index = 0) => {
  const modelType = lot.modelType || 'Language';
  const hash = Math.abs(index + String(lot.title || lot.id || '').length);
  return {
    ...lot,
    version: lot.version || `1.${hash % 4}.0`,
    parameters: lot.parameters || `${7 + (hash % 13)}B`,
    contextWindow: lot.contextWindow || [8192, 16384, 32768, 128000][hash % 4],
    seats: Number(lot.seats) > 0 ? Number(lot.seats) : 3 + (hash % 6),
    monthlyInferences: Number(lot.monthlyInferences) > 0 ? Number(lot.monthlyInferences) : 10000 * (2 + (hash % 8)),
    commercialUse: lot.commercialUse !== false,
    researchUse: lot.researchUse !== false,
    royaltyBps: Number.isFinite(Number(lot.royaltyBps)) ? Number(lot.royaltyBps) : 500,
    inferencePriceHub: Number(lot.inferencePriceHub) >= 0 ? Number(lot.inferencePriceHub) : 0.02,
    qualityScore: Number(lot.qualityScore) || 68 + (hash % 28),
    latencyMs: Number(lot.latencyMs) || 55 + (hash % 70),
    bondPool: lot.bondPool || POOL_BY_TYPE[modelType] || 'Language Bond',
    listBondHub: Number(lot.listBondHub) > 0 ? Number(lot.listBondHub) : 25,
    safety: lot.safety || (hash % 2 === 0 ? 'review-gated' : 'standard'),
  };
};

const enrichLicense = (license, lot) => {
  const terms = attachModelTerms(lot || {});
  const expired = license.expiresAt ? Date.parse(license.expiresAt) < Date.now() : false;
  return {
    ...license,
    seats: Number(license.seats) > 0 ? Number(license.seats) : terms.seats,
    remainingInferences:
      license.remainingInferences == null ? terms.monthlyInferences : Number(license.remainingInferences),
    usedInferences: Number(license.usedInferences || 0),
    commercialUse: license.commercialUse !== false && terms.commercialUse,
    inferencePriceHub: Number(license.inferencePriceHub >= 0 ? license.inferencePriceHub : terms.inferencePriceHub),
    expired,
    status: expired && license.status === 'active' ? 'expired' : license.status,
    daysLeft: license.expiresAt
      ? Math.max(0, Math.ceil((Date.parse(license.expiresAt) - Date.now()) / 86400000))
      : 0,
  };
};

module.exports = {
  POOL_BY_TYPE,
  attachModelTerms,
  enrichLicense,
};
