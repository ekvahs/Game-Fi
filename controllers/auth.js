const { validationResult } = require('express-validator');
const platform = require('../utils/platform');
const { asyncHandler } = require('../utils/errors');
const { sendValidationError } = require('../utils/response');
const { HTTP_STATUS } = require('../utils/constants');

exports.getCurrentUser = asyncHandler(async (req, res) => {
  const user = platform.getMe(req.user.id);
  return res.status(HTTP_STATUS.OK).json(user);
});


exports.login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { email, password, name } = req.body;
  const result = await platform.login({ email, password, name });
  return res.status(HTTP_STATUS.OK).json({
    token: result.token,
    user: result.user,
    success: true,
  });
});