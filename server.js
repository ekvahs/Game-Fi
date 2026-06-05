require('dotenv').config();
const express = require('express');
const config = require('./config');
const configureMiddleware = require('./middleware');
const configureRoutes = require('./routes');
const configureClient = require('./middleware/client');
const connectUser = require('./controllers/users').connectUser;
const errorHandler = require('./middleware/errorHandler');
const bodyParser = require("body-parser");

const app = express();

configureMiddleware(app);

configureRoutes(app);

configureClient(app);

app.use(errorHandler);

app.use(bodyParser.urlencoded({
    extended: true
}));

const server = app.listen(config.PORT, '127.0.0.1', () => {
  console.log(
    `MarketHub is running in ${config.NODE_ENV} mode at http://127.0.0.1:${config.PORT}`
  );
  connectUser();
});

const gracefulShutdown = (signal) => {
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 10000);
};

process.on('unhandledRejection', (err) => {
  gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server };