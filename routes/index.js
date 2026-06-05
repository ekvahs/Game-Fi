/**
 * Configure all application routes
 * @param {Express} app - Express application instance
 */
const configureRoutes = (app) => {
  // API routes
  app.use('/api/auth', require('./api/auth'));
  app.use('/api/users', require('./api/users'));
  app.use('/api/models', require('./api/models'));
  app.use('/api/suites', require('./api/suites'));
  app.use('/api/ai', require('./api/ai'));
  app.use('/api/payments', require('./api/payments'));
  app.use('/api/protocol', require('./api/protocol'));
  app.use('/api/wallet', require('./api/wallet'));


  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'AI Custom Model MarketHub API',
      version: '1.0.0',
    });
  });

  // 404 handler for unknown API routes only
  app.use('/api', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.originalUrl,
    });
  });
};

module.exports = configureRoutes;  