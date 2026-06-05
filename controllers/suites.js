const platform = require('../utils/platform');
const { asyncHandler } = require('../utils/errors');
const { HTTP_STATUS } = require('../utils/constants');

const getSuites = asyncHandler(async (req, res) => {
  const suites = platform.listSuites();
  return res.status(HTTP_STATUS.OK).json({ success: true, suites, data: suites });
});

const getSuiteById = asyncHandler(async (req, res) => {
  const suites = platform.listSuites();
  const suite = suites.find((item) => item.id === req.params.id || item.suiteName === req.params.id);
  return res.status(HTTP_STATUS.OK).json({ success: true, suite, data: suite });
});

const createSuite = asyncHandler(async (req, res) => {
  const suites = platform.listSuites();
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Suites are derived from live lots. Publish a lot to grow a suite.',
    suites,
  });
});

module.exports = {
  getSuites,
  getSuiteById,
  createSuite,
};
