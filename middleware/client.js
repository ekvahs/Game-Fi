const path = require('path');
const express = require('express');

const isApiPath = (reqPath) => reqPath === '/health' || reqPath.startsWith('/api');

const configureClient = (app) => {
  const clientDir = path.join(__dirname, '..', 'client');
  const publicDir = path.join(clientDir, 'public');
  const owlDir = path.join(clientDir, 'src', 'assets', 'owl-carousel');
  const distDir = path.join(clientDir, 'dist');
  const indexFile = path.join(distDir, 'index.html');

  app.use(express.static(publicDir));
  app.use('/owl-carousel', express.static(owlDir));
  app.use(express.static(distDir));

  app.get('*', (req, res, next) => {
    if (isApiPath(req.path)) return next();
    if (path.extname(req.path)) return next();
    res.sendFile(indexFile, (err) => {
      if (!err) return;
      res
        .status(503)
        .type('html')
        .send(
          '<!doctype html><title>MarketHub</title><p>Client files are missing. Run <code>npm run build</code> once, then refresh.</p>',
        );
    });
  });
};

module.exports = configureClient;
