const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('../../config');
const { TREASURY_ID, PROTOCOL, DEMO_PASSWORD } = require('./constants');
const { attachModelTerms } = require('./terms');

const STORE_PATH = path.join(__dirname, '..', '..', 'data', 'protocol-store.json');
const CATALOG_PATH = path.join(__dirname, '..', '..', 'client', 'src', 'data', 'data.json');

const emptyState = () => ({
  meta: { version: 2, seeded: false },
  users: [],
  wallets: [],
  lots: [],
  listings: [],
  licenses: [],
  stakes: [],
  orders: [],
  offers: [],
  notifications: [],
  transactions: [],
  counters: {
    user: 1,
    lot: 1,
    listing: 1,
    license: 1,
    stake: 1,
    order: 1,
    offer: 1,
    note: 1,
    tx: 1,
  },
});

const ensureDir = () => {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const readState = () => {
  ensureDir();
  if (!fs.existsSync(STORE_PATH)) return emptyState();
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return normalizeState(parsed);
  } catch (err) {
    return emptyState();
  }
};

const writeState = (state) => {
  ensureDir();
  const tmp = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  try {
    fs.renameSync(tmp, STORE_PATH);
  } catch (err) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2));
    try {
      fs.unlinkSync(tmp);
    } catch (_) {
      // ignore
    }
  }
};

const normalizeState = (raw) => {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    meta: { ...base.meta, ...(raw.meta || {}) },
    users: raw.users || [],
    wallets: raw.wallets || [],
    lots: raw.lots || [],
    listings: raw.listings || [],
    licenses: raw.licenses || [],
    stakes: raw.stakes || [],
    orders: raw.orders || [],
    offers: raw.offers || [],
    notifications: raw.notifications || [],
    transactions: raw.transactions || [],
    counters: { ...base.counters, ...(raw.counters || {}) },
  };
};

const nextId = (state, key, prefix) => {
  const n = state.counters[key] || 1;
  state.counters[key] = n + 1;
  return `${prefix}_${n}`;
};

const nowIso = () => new Date().toISOString();

const roundHub = (value) => Math.round(Number(value || 0) * 100) / 100;

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);

const ensureWallet = (state, userId) => {
  let wallet = state.wallets.find((item) => item.userId === userId);
  if (!wallet) {
    wallet = {
      userId,
      available: 0,
      reserved: 0,
      escrow: 0,
      lifetimeIn: 0,
      lifetimeOut: 0,
      updated: nowIso(),
    };
    state.wallets.push(wallet);
  }
  return wallet;
};

const publicUser = (user, wallet) => {
  if (!user) return null;
  const { password, ...rest } = user;
  return {
    ...rest,
    wallet: wallet
      ? {
          available: roundHub(wallet.available),
          reserved: roundHub(wallet.reserved),
          escrow: roundHub(wallet.escrow),
          total: roundHub(wallet.available + wallet.reserved + wallet.escrow),
        }
      : null,
  };
};

const loadCatalogSource = () => {
  try {
    const data = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    return {
      nfts: Array.isArray(data?.NFTsMarket?.NFTs) ? data.NFTsMarket.NFTs : [],
      collections: Array.isArray(data?.NFTsMarket?.Collections)
        ? data.NFTsMarket.Collections
        : [],
    };
  } catch (err) {
    return { nfts: [], collections: [] };
  }
};

const seedState = (state) => {
  if (state.meta.seeded && state.users.length && state.lots.length) return state;

  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const created = nowIso();

  if (!state.users.length) {
    const treasury = {
      id: TREASURY_ID,
      name: 'MarketHub Treasury',
      email: 'treasury@markethub.local',
      password: passwordHash,
      avatar: '/icon.svg',
      bio: 'Protocol fee sink and house ledger operator.',
      role: 'treasury',
      verified: true,
      type: 1,
      stats: { volumeHub: 0, licensesSold: 0, followers: 0 },
      lastFaucetAt: null,
      created,
    };

    const maya = {
      id: nextId(state, 'user', 'usr'),
      name: 'Maya Builder',
      email: 'maya@markethub.local',
      password: passwordHash,
      avatar: '/images/creators/Allison Torff.png',
      bio: 'Lists language and vision models on MarketHub.',
      role: 'builder',
      verified: true,
      type: 0,
      stats: { volumeHub: 0, licensesSold: 0, followers: 1840 },
      lastFaucetAt: null,
      created,
    };

    const kai = {
      id: nextId(state, 'user', 'usr'),
      name: 'Kai Licensee',
      email: 'kai@markethub.local',
      password: passwordHash,
      avatar: '/images/creators/Angel Lubin.png',
      bio: 'Buys and trades inference licenses.',
      role: 'licensee',
      verified: true,
      type: 0,
      stats: { volumeHub: 0, licensesSold: 0, followers: 420 },
      lastFaucetAt: null,
      created,
    };

    const nova = {
      id: nextId(state, 'user', 'usr'),
      name: 'Nova Trader',
      email: 'nova@markethub.local',
      password: passwordHash,
      avatar: '/images/creators/Kianna Donin.png',
      bio: 'Secondary-market license desk.',
      role: 'trader',
      verified: false,
      type: 0,
      stats: { volumeHub: 0, licensesSold: 0, followers: 96 },
      lastFaucetAt: null,
      created,
    };

    state.users.push(treasury, maya, kai, nova);

    const grant = (userId, amount) => {
      const wallet = ensureWallet(state, userId);
      wallet.available = roundHub(amount);
      wallet.lifetimeIn = roundHub(amount);
      wallet.updated = created;
    };

    grant(TREASURY_ID, 0);
    grant(maya.id, config.INITIAL_CHIPS_AMOUNT);
    grant(kai.id, config.INITIAL_CHIPS_AMOUNT);
    grant(nova.id, config.INITIAL_CHIPS_AMOUNT);
  }

  if (state.lots.length > 0) {
    state.meta.seeded = true;
    state.meta.version = 2;
    return state;
  }

  const builder =
    state.users.find((user) => user.email === 'maya@markethub.local') || state.users[1];
  const trader =
    state.users.find((user) => user.email === 'nova@markethub.local') || state.users[3] || builder;

  const { nfts } = loadCatalogSource();
  const owners = [builder.id, trader.id];
  const take = nfts.slice(0, 24);

  take.forEach((item, index) => {
    const ownerId = owners[index % owners.length];
    const modelType =
      (item.filter || []).find((tag) =>
        ['Language', 'Vision', 'Audio', 'Multimodal'].includes(tag),
      ) || 'Language';
    const priceHub = roundHub(Math.max(Number(item.postPrice) || 0, 0) * 40) || 0;
    const lot = attachModelTerms({
      id: nextId(state, 'lot', 'lot'),
      slug: slugify(item.postTitle) || `model-${index + 1}`,
      title: item.postTitle,
      description: item.postdescreption || 'Custom AI model lot on MarketHub.',
      modelType,
      ownerId,
      imageUrl: item.postImg || '',
      tags: item.filter || [modelType],
      verified: Boolean(item.verified),
      status: priceHub > 0 ? 'listed' : 'draft',
      licenseMode: index % 9 === 0 ? 'exclusive' : 'open',
      created,
    }, index);
    state.lots.push(lot);

    if (priceHub > 0) {
      state.listings.push({
        id: nextId(state, 'listing', 'lst'),
        lotId: lot.id,
        licenseId: null,
        sellerId: ownerId,
        priceHub,
        kind: 'primary',
        status: 'open',
        created,
      });
    }
  });

  state.meta.seeded = true;
  state.meta.version = 2;
  state.meta.demoPassword = DEMO_PASSWORD;
  state.meta.seededAt = created;
  return state;
};

const load = () => {
  let state = readState();
  const needsSeed = !state.meta.seeded || !state.users.length || !state.lots.length;
  if (needsSeed) {
    state = seedState(state);
    writeState(state);
  }
  let dirty = false;
  state.lots = state.lots.map((lot, index) => {
    if (lot.monthlyInferences && lot.parameters) return lot;
    dirty = true;
    return attachModelTerms(lot, index);
  });
  if (dirty) writeState(state);
  return state;
};

const mutate = (fn) => {
  const state = seedState(readState());
  const result = fn(state);
  writeState(state);
  return result;
};

module.exports = {
  STORE_PATH,
  emptyState,
  readState,
  writeState,
  load,
  mutate,
  nextId,
  nowIso,
  roundHub,
  slugify,
  ensureWallet,
  publicUser,
  seedState,
};
