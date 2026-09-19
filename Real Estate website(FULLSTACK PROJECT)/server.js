const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');
const { connectDatabase, disconnectDatabase } = require('./config/database');

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable', database: ready ? 'connected' : 'disconnected' });
});

app.use('/api', async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch {
    res.status(503).json({ error: 'Database unavailable. Check that MongoDB is running and MONGODB_URI is correct.' });
  }
});
app.use('/api/properties', require('./routes/propertyroutes'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/agent', require('./routes/agent'));
app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));
app.use(express.static(config.publicDir));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = err.status || err.statusCode || 500;
  let message = err.message;
  if (err.name === 'ValidationError' || err.name === 'CastError' || err.name === 'MulterError') status = 400;
  if (err.code === 11000) {
    status = 409;
    message = 'Username or email already exists.';
  }
  if (err.type === 'entity.parse.failed') message = 'Request body must be valid JSON.';
  if (status >= 500) {
    console.error('Request failed:', err.name);
    message = 'An unexpected server error occurred. Please try again.';
  }
  res.status(status).json({ error: message, message });
});

async function start() {
  await connectDatabase();
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const server = app.listen(config.port, () => {
    console.log(`LuxeEstate running at http://localhost:${config.port}`);
    console.log('MongoDB connected. Admin credentials are configured in .env.');
  });
  server.on('error', async error => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${config.port} is already in use. Choose another PORT in .env.` : 'Could not start the HTTP server.');
    await disconnectDatabase();
    process.exitCode = 1;
  });
  const shutdown = () => server.close(async () => {
    await disconnectDatabase();
    process.exitCode = 0;
  });
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return server;
}

if (require.main === module) {
  start().catch(async () => {
    console.error('Startup failed: check that MongoDB is running and MONGODB_URI is correct.');
    await disconnectDatabase();
    process.exitCode = 1;
  });
}

module.exports = app;
