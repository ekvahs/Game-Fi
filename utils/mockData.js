const config = require('../config');

/**
 * In-memory mock data store for demo purposes
 * This replaces database operations for the demo project
 */

let users = [];
let suites = [];
let catalogModels = [];
let nextUserId = 1;
let nextSuiteId = 1;
let nextModelId = 1;

/**
 * Initialize mock data with demo users, suites, and models
 */
const initializeMockData = () => {
  users = [
    {
      id: '1',
      name: 'Demo Player 1',
      email: 'player1@demo.com',
      password: 'hashed_password_demo',
      chipsAmount: config.INITIAL_CHIPS_AMOUNT,
      type: 0,
      created: new Date(),
    },
    {
      id: '2',
      name: 'Demo Player 2',
      email: 'player2@demo.com',
      password: 'hashed_password_demo',
      chipsAmount: config.INITIAL_CHIPS_AMOUNT,
      type: 0,
      created: new Date(),
    },
  ];

  suites = [
    {
      id: '1',
      suiteName: 'DSGN Animals',
      description: 'A language and vision suite of custom animal avatars.',
      ownerId: '1',
      imageUrl: '/images/collections/collection-1.png',
      created: new Date(),
    },
    {
      id: '2',
      suiteName: 'Magic Mushrooms',
      description: 'A multimodal suite inspired by surreal generated landscapes.',
      ownerId: '2',
      imageUrl: '/images/collections/collection-2.png',
      created: new Date(),
    },
  ];

  catalogModels = [
    {
      id: '1',
      title: 'Lunar Fox',
      description: 'A custom vision model from the DSGN Animals suite.',
      price: 2.5,
      ownerId: '1',
      suiteId: '1',
      imageUrl: '/images/nfts/nft-1.png',
      created: new Date(),
    },
    {
      id: '2',
      title: 'Shroom Glow',
      description: 'A custom generative model from the Magic Mushrooms suite.',
      price: 3.0,
      ownerId: '2',
      suiteId: '2',
      imageUrl: '/images/nfts/nft-2.png',
      created: new Date(),
    },
  ];

  nextUserId = 3;
  nextSuiteId = 3;
  nextModelId = 3;
};

// Initialize on module load
initializeMockData();

/**
 * Mock Data Store
 * Provides database-like operations for demo purposes
 */
const mockDataStore = {
  users: {
    findById: (id) => {
      if (!id) return null;
      return users.find((user) => user.id === String(id)) || null;
    },

    findOne: (query) => {
      if (!query) return null;

      if (query.email) {
        return users.find((user) => user.email.toLowerCase() === query.email.toLowerCase().trim()) || null;
      }
      if (query.name) {
        return users.find((user) => user.name.toLowerCase() === query.name.toLowerCase().trim()) || null;
      }
      return null;
    },

    create: (userData) => {
      if (!userData || !userData.email || !userData.name) {
        throw new Error('Invalid user data');
      }

      const newUser = {
        id: String(nextUserId++),
        name: userData.name.trim(),
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        chipsAmount: userData.chipsAmount || config.INITIAL_CHIPS_AMOUNT,
        type: userData.type || 0,
        created: new Date(),
      };

      users.push(newUser);
      return newUser;
    },

    update: (id, updateData) => {
      if (!id || !updateData) return null;

      const userIndex = users.findIndex((user) => user.id === String(id));
      if (userIndex === -1) return null;

      users[userIndex] = {
        ...users[userIndex],
        ...updateData,
        id: users[userIndex].id,
        created: users[userIndex].created,
      };

      return users[userIndex];
    },

    getUserWithoutPassword: (user) => {
      if (!user) return null;
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    },

    findAll: () => {
      return users.map((user) => mockDataStore.users.getUserWithoutPassword(user));
    },

    reset: () => {
      initializeMockData();
    },
  },

  suites: {
    findById: (id) => {
      if (!id) return null;
      return suites.find((suite) => suite.id === String(id)) || null;
    },

    findOne: (query) => {
      if (!query) return null;

      if (query.suiteName) {
        return suites.find((suite) => suite.suiteName.toLowerCase() === query.suiteName.toLowerCase().trim()) || null;
      }
      return null;
    },

    findAll: () => {
      return suites.slice();
    },

    create: (suiteData) => {
      if (!suiteData || !suiteData.suiteName) {
        throw new Error('Invalid suite data');
      }

      const newSuite = {
        id: String(nextSuiteId++),
        suiteName: suiteData.suiteName.trim(),
        description: suiteData.description || '',
        ownerId: suiteData.ownerId || null,
        imageUrl: suiteData.imageUrl || '',
        created: new Date(),
      };

      suites.push(newSuite);
      return newSuite;
    },

    update: (id, updateData) => {
      if (!id || !updateData) return null;
      const suiteIndex = suites.findIndex((suite) => suite.id === String(id));
      if (suiteIndex === -1) return null;

      suites[suiteIndex] = {
        ...suites[suiteIndex],
        ...updateData,
        id: suites[suiteIndex].id,
        created: suites[suiteIndex].created,
      };

      return suites[suiteIndex];
    },

    remove: (id) => {
      const suiteIndex = suites.findIndex((suite) => suite.id === String(id));
      if (suiteIndex === -1) return null;
      return suites.splice(suiteIndex, 1)[0];
    },
  },

  models: {
    findById: (id) => {
      if (!id) return null;
      return catalogModels.find((model) => model.id === String(id)) || null;
    },

    findBySuiteId: (suiteId) => {
      if (!suiteId) return [];
      return catalogModels.filter((model) => model.suiteId === String(suiteId));
    },

    findAll: () => {
      return catalogModels.slice();
    },

    create: (modelData) => {
      if (!modelData || !modelData.title) {
        throw new Error('Invalid model data');
      }

      const newModel = {
        id: String(nextModelId++),
        title: modelData.title.trim(),
        description: modelData.description || '',
        price: Number(modelData.price) || 0,
        ownerId: modelData.ownerId || null,
        suiteId: modelData.suiteId || null,
        imageUrl: modelData.imageUrl || '',
        created: new Date(),
      };

      catalogModels.push(newModel);
      return newModel;
    },

    update: (id, updateData) => {
      if (!id || !updateData) return null;
      const modelIndex = catalogModels.findIndex((model) => model.id === String(id));
      if (modelIndex === -1) return null;

      catalogModels[modelIndex] = {
        ...catalogModels[modelIndex],
        ...updateData,
        id: catalogModels[modelIndex].id,
        created: catalogModels[modelIndex].created,
      };

      return catalogModels[modelIndex];
    },

    remove: (id) => {
      const modelIndex = catalogModels.findIndex((model) => model.id === String(id));
      if (modelIndex === -1) return null;
      return catalogModels.splice(modelIndex, 1)[0];
    },
  },
};

module.exports = mockDataStore;
