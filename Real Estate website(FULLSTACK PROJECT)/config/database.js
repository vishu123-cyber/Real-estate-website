const mongoose = require('mongoose');
const { mongodbUri } = require('./index');

let connectionPromise;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongodbUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    }).finally(() => { connectionPromise = undefined; });
  }
  await connectionPromise;
  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
