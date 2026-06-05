const platform = require('../utils/platform');
const { asyncHandler, NotFoundError } = require('../utils/errors');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

const getModels = asyncHandler(async (req, res) => {
  const models = platform.listCatalog({
    q: req.query.q,
    modelType: req.query.modelType || req.query.suiteId,
    listed: req.query.listed,
  });
  return res.status(HTTP_STATUS.OK).json({ success: true, models, data: models });
});

const getModelById = asyncHandler(async (req, res) => {
  const model = platform.getLot(req.params.id);
  if (!model) throw new NotFoundError(ERROR_MESSAGES.MODEL_NOT_FOUND);
  return res.status(HTTP_STATUS.OK).json({ success: true, model, data: model });
});

const createModel = asyncHandler(async (req, res) => {
  const { title, description, price, imageUrl, modelType } = req.body || {};
  const data = platform.createLot({
    userId: req.user?.id,
    title,
    description,
    modelType,
    imageUrl,
    priceHub: price,
  });
  return res.status(HTTP_STATUS.CREATED).json({ success: true, model: data.lot, data });
});

module.exports = {
  getModels,
  getModelById,
  createModel,
};
