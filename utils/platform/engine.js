const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const { AppError, AuthenticationError, ConflictError, NotFoundError } = require('../errors');
const { HTTP_STATUS } = require('../constants');
const { TREASURY_ID, POOLS, PROTOCOL } = require('./constants');
const { attachModelTerms, enrichLicense } = require('./terms');
const store = require('./store');

const {
  load,
  mutate,
  nextId,
  nowIso,
  roundHub,
  slugify,
  ensureWallet,
  publicUser,
} = store;

const fail = (message, status = HTTP_STATUS.BAD_REQUEST) => {
  throw new AppError(message, status);
};

const recordTx = (state, payload) => {
  const tx = {
    id: nextId(state, 'tx', 'tx'),
    created: nowIso(),
    ...payload,
    amountHub: roundHub(payload.amountHub || 0),
  };
  state.transactions.unshift(tx);
  return tx;
};

const notify = (state, userId, title, body, kind = 'info') => {
  if (!userId || userId === TREASURY_ID) return null;
  const note = {
    id: nextId(state, 'note', 'ntf'),
    userId,
    kind,
    title,
    body,
    read: false,
    created: nowIso(),
  };
  state.notifications.unshift(note);
  state.notifications = state.notifications.slice(0, 400);
  return note;
};

const findUser = (state, id) => state.users.find((user) => user.id === String(id));

const findUserByLogin = (state, login) => {
  const value = String(login || '').trim().toLowerCase();
  if (!value) return null;
  return state.users.find(
    (user) =>
      user.email.toLowerCase() === value || user.name.toLowerCase() === value,
  );
};

const requireUser = (state, userId) => {
  const user = findUser(state, userId);
  if (!user) throw new AuthenticationError('Sign in to continue');
  return user;
};

const debit = (state, userId, amount, account, meta) => {
  const value = roundHub(amount);
  if (value < 0) fail('Invalid amount');
  const wallet = ensureWallet(state, userId);
  if (roundHub(wallet[account]) < value) {
    fail(`Insufficient ${account} HUB`, HTTP_STATUS.BAD_REQUEST);
  }
  wallet[account] = roundHub(wallet[account] - value);
  wallet.lifetimeOut = roundHub(wallet.lifetimeOut + value);
  wallet.updated = nowIso();
  return recordTx(state, {
    userId,
    direction: 'debit',
    account,
    amountHub: value,
    ...meta,
  });
};

const credit = (state, userId, amount, account, meta) => {
  const value = roundHub(amount);
  if (value < 0) fail('Invalid amount');
  const wallet = ensureWallet(state, userId);
  wallet[account] = roundHub(wallet[account] + value);
  wallet.lifetimeIn = roundHub(wallet.lifetimeIn + value);
  wallet.updated = nowIso();
  return recordTx(state, {
    userId,
    direction: 'credit',
    account,
    amountHub: value,
    ...meta,
  });
};

const signToken = (user) =>
  jwt.sign(
    { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
    config.JWT_SECRET || 'demo-secret-key-change-in-production',
    { expiresIn: config.JWT_TOKEN_EXPIRES_IN || '7d' },
  );

const toMe = (state, user) => {
  const wallet = ensureWallet(state, user.id);
  return {
    user: publicUser(user, wallet),
    wallet: publicUser(user, wallet).wallet,
    token: undefined,
  };
};

const hydrateLot = (state, lot) => {
  if (!lot) return null;
  const terms = attachModelTerms(lot, state.lots.indexOf(lot));
  const owner = findUser(state, lot.ownerId);
  const listing = state.listings.find((item) => item.lotId === lot.id && item.status === 'open');
  const offers = state.offers.filter((item) => item.lotId === lot.id && item.status === 'open');
  const licenseCount = state.licenses.filter((item) => item.lotId === lot.id && item.status === 'active').length;
  return {
    ...terms,
    priceHub: listing ? listing.priceHub : 0,
    listingId: listing ? listing.id : null,
    listingKind: listing ? listing.kind : null,
    openOffers: offers.length,
    highestOfferHub: offers.reduce((max, item) => Math.max(max, Number(item.amountHub) || 0), 0),
    licenseCount,
    owner: owner
      ? { id: owner.id, name: owner.name, avatar: owner.avatar, verified: owner.verified }
      : null,
  };
};

const catalogCard = (state, lot) => {
  const hydrated = hydrateLot(state, lot);
  return {
    id: lot.id,
    slug: lot.slug,
    postTitle: lot.title,
    postImg: lot.imageUrl,
    postPrice: hydrated.priceHub,
    postHightesBid: hydrated.highestOfferHub,
    postdescreption: lot.description,
    filter: Array.from(new Set([...(lot.tags || []), lot.modelType, hydrated.listingId ? 'Listed' : 'Draft'])),
    verified: lot.verified,
    listingId: hydrated.listingId,
    modelType: lot.modelType,
    status: lot.status,
    qualityScore: hydrated.qualityScore,
    seats: hydrated.seats,
    monthlyInferences: hydrated.monthlyInferences,
    parameters: hydrated.parameters,
    contextWindow: hydrated.contextWindow,
    commercialUse: hydrated.commercialUse,
    royaltyBps: hydrated.royaltyBps,
    version: hydrated.version,
    latencyMs: hydrated.latencyMs,
    bondPool: hydrated.bondPool,
    userInfo: {
      name: hydrated.owner?.name || 'MarketHub',
      img: hydrated.owner?.avatar || '/icon.svg',
    },
  };
};

const accruedYield = (stake, at = Date.now()) => {
  if (!stake || stake.status !== 'active') return roundHub(stake?.yieldHub || 0);
  const started = Date.parse(stake.created) || at;
  const years = Math.max(0, at - started) / PROTOCOL.YIELD_YEAR_MS;
  return roundHub(Number(stake.amountHub) * (Number(stake.aprBps) / 10000) * years);
};

const withStakeYield = (stake) => ({
  ...stake,
  accruedHub: accruedYield(stake),
  yieldHub: accruedYield(stake),
});

const feeOn = (amount) => roundHub((Number(amount) * PROTOCOL.FEE_BPS) / 10000);
const royaltyOn = (amount, bps) => roundHub((Number(amount) * Number(bps || 0)) / 10000);

const bondedInPool = (state, userId, poolName) =>
  roundHub(
    state.stakes
      .filter((item) => item.userId === userId && item.status === 'active' && item.pool === poolName)
      .reduce((sum, item) => sum + Number(item.amountHub || 0), 0),
  );

const assertUnderwrite = (state, userId, lot) => {
  const terms = attachModelTerms(lot);
  const bonded = bondedInPool(state, userId, terms.bondPool);
  if (bonded < terms.listBondHub) {
    fail(
      `Listing ${lot.title || 'this model'} requires ${terms.listBondHub} HUB reserved in ${terms.bondPool}. You have ${bonded} HUB bonded there.`,
    );
  }
};

const register = async ({ name, email, password, avatar }) => {
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (cleanName.length < 2) fail('Name is required');
  if (!cleanEmail.includes('@')) fail('A valid email is required');
  if (!password || String(password).length < 6) fail('Password must be at least 6 characters');

  const passwordHash = await bcrypt.hash(String(password), 10);

  return mutate((state) => {
    if (state.users.some((user) => user.email === cleanEmail || user.name.toLowerCase() === cleanName.toLowerCase())) {
      throw new ConflictError('An account already exists with this email or name');
    }

    const user = {
      id: nextId(state, 'user', 'usr'),
      name: cleanName,
      email: cleanEmail,
      password: passwordHash,
      avatar: avatar || '',
      bio: '',
      role: 'builder',
      verified: false,
      type: 0,
      stats: { volumeHub: 0, licensesSold: 0, followers: 0 },
      lastFaucetAt: null,
      created: nowIso(),
    };
    state.users.push(user);
    credit(state, user.id, PROTOCOL.SIGNUP_GRANT, 'available', {
      flow: 'wallet',
      kind: 'signup_grant',
      note: `Welcome grant ${PROTOCOL.SIGNUP_GRANT} HUB`,
    });
    notify(state, user.id, 'Welcome to MarketHub', `Your ledger opened with ${PROTOCOL.SIGNUP_GRANT} HUB.`, 'wallet');
    const wallet = ensureWallet(state, user.id);
    return { token: signToken(user), user: publicUser(user, wallet) };
  });
};

const login = async ({ email, password, name }) => {
  const state = load();
  const user = findUserByLogin(state, email || name);
  if (!user || user.role === 'treasury') throw new AuthenticationError('Invalid credentials');
  const ok = await bcrypt.compare(String(password || ''), user.password);
  if (!ok) throw new AuthenticationError('Invalid credentials');

  return mutate((next) => {
    const live = findUser(next, user.id);
    live.lastLoginAt = nowIso();
    const wallet = ensureWallet(next, live.id);
    return { token: signToken(live), user: publicUser(live, wallet) };
  });
};

const getMe = (userId) => {
  const state = load();
  const user = requireUser(state, userId);
  const wallet = ensureWallet(state, user.id);
  return publicUser(user, wallet);
};

const getWallet = (userId) => {
  const state = load();
  requireUser(state, userId);
  const wallet = ensureWallet(state, userId);
  const stakes = state.stakes.filter((item) => item.userId === userId && item.status === 'active');
  return {
    ...wallet,
    available: roundHub(wallet.available),
    reserved: roundHub(wallet.reserved),
    escrow: roundHub(wallet.escrow),
    total: roundHub(wallet.available + wallet.reserved + wallet.escrow),
    activeBonds: stakes.length,
    accruedHub: roundHub(stakes.reduce((sum, item) => sum + accruedYield(item), 0)),
  };
};

const faucet = (userId) =>
  mutate((state) => {
    const user = requireUser(state, userId);
    const last = user.lastFaucetAt ? Date.parse(user.lastFaucetAt) : 0;
    if (Date.now() - last < PROTOCOL.FAUCET_COOLDOWN_MS) {
      fail('Faucet is cooling down. Try again later.');
    }
    user.lastFaucetAt = nowIso();
    credit(state, user.id, PROTOCOL.FAUCET_AMOUNT, 'available', {
      flow: 'wallet',
      kind: 'faucet',
      note: `Demo faucet +${PROTOCOL.FAUCET_AMOUNT} HUB`,
    });
    notify(state, user.id, 'HUB credited', `${PROTOCOL.FAUCET_AMOUNT} HUB arrived from the demo faucet.`, 'wallet');
    const funded = ensureWallet(state, user.id);
    return {
      ...funded,
      available: roundHub(funded.available),
      reserved: roundHub(funded.reserved),
      escrow: roundHub(funded.escrow),
      total: roundHub(funded.available + funded.reserved + funded.escrow),
    };
  });

const listWalletLedger = (userId) => {
  const state = load();
  requireUser(state, userId);
  return state.transactions.filter((item) => item.userId === userId).slice(0, 100);
};

const listCatalog = ({ q, modelType, listed } = {}) => {
  const state = load();
  let lots = state.lots.slice();
  if (modelType) {
    lots = lots.filter((lot) => lot.modelType.toLowerCase() === String(modelType).toLowerCase());
  }
  if (listed === 'true' || listed === true) {
    lots = lots.filter((lot) => state.listings.some((item) => item.lotId === lot.id && item.status === 'open'));
  }
  if (q) {
    const needle = String(q).toLowerCase();
    lots = lots.filter(
      (lot) =>
        lot.title.toLowerCase().includes(needle) ||
        lot.description.toLowerCase().includes(needle) ||
        lot.modelType.toLowerCase().includes(needle),
    );
  }
  return lots.map((lot) => catalogCard(state, lot));
};

const getLot = (idOrSlug) => {
  const state = load();
  const key = String(idOrSlug || '');
  const lot = state.lots.find((item) => item.id === key || item.slug === key || item.title === key);
  if (!lot) throw new NotFoundError('Model lot not found');
  return hydrateLot(state, lot);
};

const createLot = ({
  userId,
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
}) =>
  mutate((state) => {
    const user = requireUser(state, userId);
    const cleanTitle = String(title || '').trim();
    if (cleanTitle.length < 2) fail('Lot title is required');
    const lot = attachModelTerms({
      id: nextId(state, 'lot', 'lot'),
      slug: slugify(cleanTitle) || `lot-${state.counters.lot}`,
      title: cleanTitle,
      description: description ? String(description).trim() : '',
      modelType: modelType || 'Language',
      ownerId: user.id,
      imageUrl: imageUrl || '',
      tags: Array.isArray(tags) && tags.length ? tags : [modelType || 'Language', 'Recent'],
      verified: Boolean(user.verified),
      status: 'draft',
      licenseMode: licenseMode === 'exclusive' ? 'exclusive' : 'open',
      version,
      seats,
      monthlyInferences,
      commercialUse,
      royaltyBps,
      inferencePriceHub,
      parameters,
      contextWindow,
      created: nowIso(),
    }, state.lots.length);
    state.lots.unshift(lot);
    recordTx(state, {
      userId: user.id,
      flow: 'list',
      kind: 'lot_created',
      amountHub: 0,
      refId: lot.id,
      note: `Created lot ${lot.title} ${lot.parameters} / ${lot.seats} seats / ${lot.monthlyInferences} inferences`,
    });

    let listing = null;
    if (priceHub && Number(priceHub) > 0) {
      listing = openListing(state, {
        lot,
        sellerId: user.id,
        priceHub: Number(priceHub),
        kind: 'primary',
      });
    }
    notify(state, user.id, 'Lot published', `${lot.title} is on the house catalog.`, 'list');
    return { lot: hydrateLot(state, lot), listing };
  });

const openListing = (state, { lot, sellerId, priceHub, kind, licenseId }) => {
  if (kind !== 'secondary') {
    assertUnderwrite(state, sellerId, lot);
  }
  const listing = {
    id: nextId(state, 'listing', 'lst'),
    lotId: lot.id,
    licenseId: licenseId || null,
    sellerId,
    priceHub: roundHub(priceHub),
    kind: kind || 'primary',
    status: 'open',
    created: nowIso(),
  };
  lot.status = 'listed';
  state.listings.unshift(listing);
  recordTx(state, {
    userId: sellerId,
    flow: 'list',
    kind: 'listing_opened',
    amountHub: listing.priceHub,
    refId: listing.id,
    note: `Opened ${listing.kind} listing for ${lot.title} at ${listing.priceHub} HUB`,
  });
  return listing;
};

const createListing = ({ userId, lotId, priceHub, licenseId }) =>
  mutate((state) => {
    const user = requireUser(state, userId);
    const lot = state.lots.find((item) => item.id === String(lotId));
    if (!lot) throw new NotFoundError('Lot not found');
    const amount = Number(priceHub);
    if (!amount || amount <= 0) fail('Listing price must be greater than 0');

    if (licenseId) {
      const license = state.licenses.find((item) => item.id === String(licenseId));
      if (!license || license.ownerId !== user.id) fail('You do not own this license', HTTP_STATUS.FORBIDDEN);
      if (license.status !== 'active') fail('License is not transferable right now');
      license.status = 'listed';
      return openListing(state, {
        lot,
        sellerId: user.id,
        priceHub: amount,
        kind: 'secondary',
        licenseId: license.id,
      });
    }

    if (lot.ownerId !== user.id) fail('Only the lot owner can open a primary listing', HTTP_STATUS.FORBIDDEN);
    const existing = state.listings.find((item) => item.lotId === lot.id && item.status === 'open' && item.kind === 'primary');
    if (existing) fail('This lot already has an open primary listing');
    return openListing(state, { lot, sellerId: user.id, priceHub: amount, kind: 'primary' });
  });

const listListings = ({ status } = {}) => {
  const state = load();
  return state.listings
    .filter((item) => (status ? item.status === status : true))
    .map((listing) => {
      const lot = state.lots.find((item) => item.id === listing.lotId);
      const seller = findUser(state, listing.sellerId);
      return {
        ...listing,
        title: lot?.title || listing.lotId,
        imageUrl: lot?.imageUrl || '',
        modelType: lot?.modelType || 'Language',
        sellerName: seller?.name || listing.sellerId,
      };
    });
};

const listStakes = (userId) => {
  const state = load();
  if (!userId) return [];
  return state.stakes.filter((item) => item.userId === userId).map(withStakeYield);
};

const createStake = ({ userId, pool, amountHub }) =>
  mutate((state) => {
    const user = requireUser(state, userId);
    const poolName = POOLS[pool] ? pool : 'Language Bond';
    const spec = POOLS[poolName];
    const amount = roundHub(amountHub);
    if (amount < spec.minHub) fail(`Minimum reserve for ${poolName} is ${spec.minHub} HUB`);

    debit(state, user.id, amount, 'available', {
      flow: 'reserve',
      kind: 'hub_reserved',
      refId: null,
      note: `Lock ${amount} HUB into ${poolName}`,
    });
    const wallet = ensureWallet(state, user.id);
    wallet.reserved = roundHub(wallet.reserved + amount);

    const stake = {
      id: nextId(state, 'stake', 'stk'),
      userId: user.id,
      pool: poolName,
      amountHub: amount,
      aprBps: spec.aprBps,
      yieldHub: 0,
      status: 'active',
      created: nowIso(),
    };
    state.stakes.unshift(stake);
    recordTx(state, {
      userId: user.id,
      flow: 'reserve',
      kind: 'bond_opened',
      amountHub: amount,
      refId: stake.id,
      account: 'reserved',
      note: `Reserved ${amount} HUB in ${poolName} at ${(spec.aprBps / 100).toFixed(2)}% APR`,
    });
    notify(state, user.id, 'HUB reserved', `${amount} HUB is locked in ${poolName}.`, 'reserve');
    return withStakeYield(stake);
  });

const collectStake = ({ userId, stakeId }) =>
  mutate((state) => {
    const user = requireUser(state, userId);
    const stake = state.stakes.find((item) => item.id === String(stakeId));
    if (!stake) throw new NotFoundError('Stake not found');
    if (stake.userId !== user.id) fail('You can only collect your own reserve', HTTP_STATUS.FORBIDDEN);
    if (stake.status !== 'active') fail('Stake is not active');

    const yieldHub = accruedYield(stake);
    stake.status = 'collected';
    stake.yieldHub = yieldHub;
    stake.collectedAt = nowIso();

    const wallet = ensureWallet(state, user.id);
    wallet.reserved = roundHub(Math.max(0, wallet.reserved - stake.amountHub));
    credit(state, user.id, stake.amountHub, 'available', {
      flow: 'collect',
      kind: 'principal_returned',
      refId: stake.id,
      note: `Returned ${stake.amountHub} HUB principal from ${stake.pool}`,
    });
    if (yieldHub > 0) {
      credit(state, user.id, yieldHub, 'available', {
        flow: 'collect',
        kind: 'yield_collected',
        refId: stake.id,
        note: `Collected ${yieldHub} HUB yield from ${stake.pool}`,
      });
    }
    notify(state, user.id, 'Yield collected', `${roundHub(stake.amountHub + yieldHub)} HUB returned to available balance.`, 'collect');
    return withStakeYield(stake);
  });

const settleOrder = (state, { listing, buyer, flow }) => {
  const lot = state.lots.find((item) => item.id === listing.lotId);
  if (!lot) fail('Listed lot is missing');
  if (listing.sellerId === buyer.id) fail('You cannot take your own listing');
  if (listing.status !== 'open') fail('Listing is not open');

  const price = roundHub(listing.priceHub);
  const fee = feeOn(price);
  const terms = attachModelTerms(lot);
  const royaltyBps =
    listing.kind === 'secondary' && lot.ownerId !== listing.sellerId
      ? Number(terms.royaltyBps || PROTOCOL.ROYALTY_BPS)
      : 0;
  const royalty = Math.min(royaltyOn(price, royaltyBps), roundHub(price - fee));
  const sellerNet = roundHub(price - fee - royalty);

  if (price > 0) {
    debit(state, buyer.id, price, 'available', {
      flow,
      kind: 'license_payment',
      refId: listing.id,
      counterpartyId: listing.sellerId,
      note: `Paid ${price} HUB for ${lot.title}`,
    });
    credit(state, listing.sellerId, sellerNet, 'available', {
      flow,
      kind: 'license_proceeds',
      refId: listing.id,
      counterpartyId: buyer.id,
      note: `Received ${sellerNet} HUB from ${flow} of ${lot.title}`,
    });
    if (fee > 0) {
      credit(state, TREASURY_ID, fee, 'available', {
        flow,
        kind: 'protocol_fee',
        refId: listing.id,
        note: `Protocol fee ${fee} HUB on ${lot.title}`,
      });
    }
    if (royalty > 0) {
      credit(state, lot.ownerId, royalty, 'available', {
        flow,
        kind: 'creator_royalty',
        refId: listing.id,
        note: `Creator royalty ${royalty} HUB (${royaltyBps / 100}%) on ${lot.title}`,
      });
      notify(state, lot.ownerId, 'Royalty received', `${royalty} HUB royalty from a secondary trade of ${lot.title}.`, 'trade');
    }
  }

  let license;
  if (listing.kind === 'secondary' && listing.licenseId) {
    license = state.licenses.find((item) => item.id === listing.licenseId);
    if (!license) fail('Listed license is missing');
    license.ownerId = buyer.id;
    license.status = 'active';
    license.transferredAt = nowIso();
  } else {
    license = {
      id: nextId(state, 'license', 'lic'),
      lotId: lot.id,
      ownerId: buyer.id,
      sourceListingId: listing.id,
      status: 'active',
      termDays: PROTOCOL.LICENSE_TERM_DAYS,
      seats: terms.seats,
      remainingInferences: terms.monthlyInferences,
      usedInferences: 0,
      commercialUse: terms.commercialUse,
      inferencePriceHub: terms.inferencePriceHub,
      usageLog: [],
      created: nowIso(),
      expiresAt: new Date(Date.now() + PROTOCOL.LICENSE_TERM_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    };
    state.licenses.unshift(license);
  }

  if (lot.licenseMode === 'exclusive' || listing.kind === 'secondary') {
    listing.status = 'filled';
    lot.status = flow === 'trade' ? 'traded' : 'taken';
  } else {
    listing.status = 'open';
    lot.status = 'listed';
  }

  const order = {
    id: nextId(state, 'order', 'ord'),
    listingId: listing.id,
    lotId: lot.id,
    licenseId: license.id,
    buyerId: buyer.id,
    sellerId: listing.sellerId,
    flow,
    priceHub: price,
    feeHub: fee,
    royaltyHub: royalty,
    status: 'settled',
    created: nowIso(),
  };
  state.orders.unshift(order);

  const seller = findUser(state, listing.sellerId);
  if (seller) {
    seller.stats.volumeHub = roundHub((seller.stats.volumeHub || 0) + price);
    seller.stats.licensesSold = (seller.stats.licensesSold || 0) + 1;
  }
  buyer.stats.volumeHub = roundHub((buyer.stats.volumeHub || 0) + price);

  recordTx(state, {
    userId: buyer.id,
    flow,
    kind: flow === 'trade' ? 'license_traded' : 'license_taken',
    amountHub: price,
    refId: order.id,
    note: `${flow} ${lot.title} for ${price} HUB`,
  });
  notify(state, buyer.id, 'License acquired', `You now hold ${lot.title}.`, flow);
  notify(state, listing.sellerId, 'License sold', `${buyer.name} paid ${price} HUB for ${lot.title}.`, flow);
  return { order, license, listing, lot: hydrateLot(state, lot) };
};

const createOrder = ({ userId, listingId, flow }) =>
  mutate((state) => {
    const buyer = requireUser(state, userId);
    const listing = state.listings.find((item) => item.id === String(listingId));
    if (!listing) throw new NotFoundError('Listing not found');
    const orderFlow = listing.kind === 'secondary' || flow === 'trade' ? 'trade' : 'take';
    return settleOrder(state, { listing, buyer, flow: orderFlow });
  });

const cancelListing = ({ userId, listingId }) =>
  mutate((state) => {
    const user = requireUser(state, userId);
    const listing = state.listings.find((item) => item.id === String(listingId));
    if (!listing) throw new NotFoundError('Listing not found');
    if (listing.sellerId !== user.id) fail('Only the seller can cancel this listing', HTTP_STATUS.FORBIDDEN);
    if (listing.status !== 'open') fail('Listing is not open');
    listing.status = 'cancelled';
    listing.cancelledAt = nowIso();
    const lot = state.lots.find((item) => item.id === listing.lotId);
    if (listing.kind === 'secondary' && listing.licenseId) {
      const license = state.licenses.find((item) => item.id === listing.licenseId);
      if (license && license.status === 'listed') license.status = 'active';
    }
    if (lot && !state.listings.some((item) => item.lotId === lot.id && item.status === 'open')) {
      lot.status = lot.licenseMode === 'exclusive' ? 'draft' : 'draft';
    }
    recordTx(state, {
      userId: user.id,
      flow: 'list',
      kind: 'listing_cancelled',
      amountHub: listing.priceHub,
      refId: listing.id,
      note: `Cancelled listing ${listing.id}`,
    });
    return listing;
  });

const useLicense = ({ userId, licenseId, units }) =>
  mutate((state) => {
    const user = requireUser(state, userId);
    const license = state.licenses.find((item) => item.id === String(licenseId));
    if (!license) throw new NotFoundError('License not found');
    if (license.ownerId !== user.id) fail('You do not hold this license', HTTP_STATUS.FORBIDDEN);
    const lot = state.lots.find((item) => item.id === license.lotId);
    const live = enrichLicense(license, lot);
    if (live.expired || live.status === 'expired') {
      license.status = 'expired';
      fail('This license has expired');
    }
    if (live.status !== 'active') fail('License is not active');
    const consume = Math.max(1, Number(units) || 1);
    if (live.remainingInferences < consume) {
      fail(`Inference quota exhausted. ${live.remainingInferences} remaining.`);
    }
    const price = roundHub(consume * Number(live.inferencePriceHub || 0));
    license.remainingInferences = live.remainingInferences - consume;
    license.usedInferences = live.usedInferences + consume;
    license.usageLog = [
      { at: nowIso(), units: consume, costHub: price },
      ...(license.usageLog || []),
    ].slice(0, 25);

    if (price > 0 && lot?.ownerId && lot.ownerId !== user.id) {
      debit(state, user.id, price, 'available', {
        flow: 'collect',
        kind: 'inference_usage',
        refId: license.id,
        counterpartyId: lot.ownerId,
        note: `Ran ${consume} inference units on ${lot.title}`,
      });
      credit(state, lot.ownerId, price, 'available', {
        flow: 'collect',
        kind: 'inference_royalty',
        refId: license.id,
        note: `Inference royalty ${price} HUB from ${lot.title}`,
      });
    }
    notify(state, user.id, 'Inference run', `${consume} units on ${lot?.title || 'model'}. ${license.remainingInferences} remain.`, 'collect');
    return enrichLicense(license, lot);
  });

const createOffer = ({ userId, listingId, amountHub, note }) =>
  mutate((state) => {
    const buyer = requireUser(state, userId);
    const listing = state.listings.find((item) => item.id === String(listingId));
    if (!listing || listing.status !== 'open') fail('Open listing is required');
    if (listing.sellerId === buyer.id) fail('You cannot offer on your own listing');
    const amount = roundHub(amountHub);
    if (amount <= 0) fail('Offer amount must be greater than 0');
    const wallet = ensureWallet(state, buyer.id);
    if (wallet.available < amount) fail('Insufficient available HUB for this offer');

    debit(state, buyer.id, amount, 'available', {
      flow: 'trade',
      kind: 'offer_escrow',
      refId: listing.id,
      note: `Escrow ${amount} HUB for offer on ${listing.id}`,
    });
    wallet.escrow = roundHub(wallet.escrow + amount);

    const offer = {
      id: nextId(state, 'offer', 'ofr'),
      listingId: listing.id,
      lotId: listing.lotId,
      buyerId: buyer.id,
      sellerId: listing.sellerId,
      amountHub: amount,
      note: note ? String(note).slice(0, 240) : '',
      status: 'open',
      expiresAt: new Date(Date.now() + PROTOCOL.OFFER_EXPIRY_MS).toISOString(),
      created: nowIso(),
    };
    state.offers.unshift(offer);
    notify(state, listing.sellerId, 'New offer', `${buyer.name} offered ${amount} HUB.`, 'trade');
    return offer;
  });

const acceptOffer = ({ userId, offerId }) =>
  mutate((state) => {
    const seller = requireUser(state, userId);
    const offer = state.offers.find((item) => item.id === String(offerId));
    if (!offer) throw new NotFoundError('Offer not found');
    if (offer.sellerId !== seller.id) fail('Only the listing owner can accept this offer', HTTP_STATUS.FORBIDDEN);
    if (offer.status !== 'open') fail('Offer is not open');
    const listing = state.listings.find((item) => item.id === offer.listingId);
    if (!listing || listing.status !== 'open') fail('Listing is no longer open');

    const buyer = requireUser(state, offer.buyerId);
    const wallet = ensureWallet(state, buyer.id);
    wallet.escrow = roundHub(Math.max(0, wallet.escrow - offer.amountHub));
    credit(state, buyer.id, offer.amountHub, 'available', {
      flow: 'trade',
      kind: 'offer_escrow_release',
      refId: offer.id,
      note: 'Escrow returned to available before settlement',
    });
    listing.priceHub = offer.amountHub;
    offer.status = 'accepted';
    offer.acceptedAt = nowIso();
    state.offers
      .filter((item) => item.listingId === listing.id && item.status === 'open' && item.id !== offer.id)
      .forEach((item) => {
        item.status = 'expired';
        const other = ensureWallet(state, item.buyerId);
        other.escrow = roundHub(Math.max(0, other.escrow - item.amountHub));
        credit(state, item.buyerId, item.amountHub, 'available', {
          flow: 'trade',
          kind: 'offer_escrow_refund',
          refId: item.id,
          note: 'Offer refunded because another offer was accepted',
        });
      });
    return settleOrder(state, {
      listing,
      buyer,
      flow: listing.kind === 'secondary' ? 'trade' : 'take',
    });
  });

const listOffers = (userId) => {
  const state = load();
  if (!userId) return [];
  const rows = state.offers.filter((item) => item.buyerId === userId || item.sellerId === userId);
  return rows.map((offer) => {
    const lot = state.lots.find((item) => item.id === offer.lotId);
    return { ...offer, title: lot?.title || offer.lotId };
  });
};

const listLicenses = (userId) => {
  const state = load();
  if (!userId) return [];
  const rows = state.licenses.filter((item) => item.ownerId === userId);
  return rows.map((license) => {
    const lot = state.lots.find((item) => item.id === license.lotId);
    const live = enrichLicense(license, lot);
    return {
      ...live,
      title: lot?.title || license.lotId,
      imageUrl: lot?.imageUrl || '',
      modelType: lot?.modelType || 'Language',
      parameters: lot?.parameters,
      qualityScore: lot?.qualityScore,
    };
  });
};

const listOrders = (userId) => {
  const state = load();
  if (!userId) return [];
  const rows = state.orders.filter((item) => item.buyerId === userId || item.sellerId === userId);
  return rows.map((order) => {
    const lot = state.lots.find((item) => item.id === order.lotId);
    return { ...order, title: lot?.title || order.lotId };
  });
};

const listTransactions = () => {
  const state = load();
  return state.transactions.slice(0, 250);
};

const listNotifications = (userId) => {
  const state = load();
  requireUser(state, userId);
  return state.notifications.filter((item) => item.userId === userId).slice(0, 50);
};

const listPools = () =>
  Object.entries(POOLS).map(([name, spec]) => ({
    name,
    ...spec,
    apr: `${(spec.aprBps / 100).toFixed(2)}%`,
  }));

const dashboard = (userId) => {
  const state = load();
  const summary = {
    reserve: state.stakes.filter((item) => item.status === 'active').length,
    list: state.lots.length,
    take: state.orders.filter((item) => item.flow === 'take').length,
    trade: state.orders.filter((item) => item.flow === 'trade').length,
    collect: state.stakes.filter((item) => item.status === 'collected').length,
    ledger: state.transactions.length,
    openListings: state.listings.filter((item) => item.status === 'open').length,
    activeBondHub: roundHub(
      state.stakes.filter((item) => item.status === 'active').reduce((sum, item) => sum + Number(item.amountHub || 0), 0),
    ),
    volumeHub: roundHub(state.orders.reduce((sum, item) => sum + Number(item.priceHub || 0), 0)),
    licenses: state.licenses.filter((item) => item.status === 'active').length,
    users: state.users.filter((item) => item.role !== 'treasury').length,
    inferenceUnits: state.licenses.reduce((sum, item) => sum + Number(item.usedInferences || 0), 0),
  };

  const me = userId && findUser(state, userId) ? toMe(state, findUser(state, userId)) : null;
  const activity = state.transactions.slice(0, 12).map((item) => ({
    id: item.id,
    flow: item.flow,
    kind: item.kind,
    note: item.note,
    amountHub: item.amountHub,
    created: item.created,
  }));

  return {
    flows: [
      { key: 'reserve', title: 'Reserve', count: summary.reserve, path: '/bond' },
      { key: 'list', title: 'List', count: summary.list, path: '/studio' },
      { key: 'take', title: 'Take', count: summary.take, path: '/models' },
      { key: 'trade', title: 'Trade', count: summary.trade, path: '/licenses' },
      { key: 'collect', title: 'Collect', count: summary.collect, path: '/collect' },
      { key: 'ledger', title: 'Ledger', count: summary.ledger, path: '/transactions' },
    ],
    summary,
    activity,
    pools: listPools(),
    licenses: userId ? listLicenses(userId).slice(0, 8) : [],
    me: me?.user || null,
    wallet: me?.wallet || null,
  };
};

const listSuites = () => {
  const state = load();
  const types = ['Language', 'Vision', 'Audio', 'Multimodal'];
  return types.map((name, index) => {
    const lots = state.lots.filter((lot) => lot.modelType === name);
    return {
      id: `suite_${index + 1}`,
      suiteName: name,
      description: `${name} models listed on MarketHub.`,
      imageUrl: lots[0]?.imageUrl || '',
      count: lots.length,
    };
  });
};

module.exports = {
  load,
  register,
  login,
  getMe,
  getWallet,
  faucet,
  listWalletLedger,
  listCatalog,
  getLot,
  catalogCard,
  createLot,
  createListing,
  listListings,
  listLots: () => {
    const state = load();
    return state.lots.map((lot) => hydrateLot(state, lot));
  },
  listStakes,
  createStake,
  collectStake,
  createOrder,
  cancelListing,
  useLicense,
  listOrders,
  createOffer,
  acceptOffer,
  listOffers,
  listLicenses,
  listTransactions,
  listNotifications,
  listPools,
  dashboard,
  listSuites,
  POOLS,
  PROTOCOL,
};
