const mongoose = require('mongoose');
const { mongodbUri } = require('./index');

let connectionPromise;

async function connectDatabase() {
  if (!connectionPromise && mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongodbUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    }).then(async () => {
      // Retire the legacy generated ID from existing accounts, including Atlas.
      const users = mongoose.connection.collection('users');
      await users.updateMany({ agentIdString: { $exists: true } }, { $unset: { agentIdString: '' } });
      try {
        await users.dropIndex('agentIdString_1');
      } catch (error) {
        if (![26, 27].includes(error.code)) throw error;
      }
    }).finally(() => { connectionPromise = undefined; });
  }
  try {
    await connectionPromise;
  } catch (error) {
    const serverErrors = [...(error.reason?.servers?.values() || [])]
      .map(server => ({
        name: server.error?.name || null,
        code: server.error?.code || server.error?.cause?.code || null
      }));
    console.error('MongoDB connection failed', {
      name: error.name,
      code: error.code || error.cause?.code || null,
      serverErrors
    });
    throw error;
  }
  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
