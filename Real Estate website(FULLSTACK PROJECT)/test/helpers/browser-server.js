const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline');
const mongoose = require('mongoose');

// Manual browser checks use fake accounts and their own disposable database.
const databaseName = `realestate_test_${Date.now()}_${randomBytes(5).toString('hex')}`;
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${databaseName}`;
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.ADMIN_USERNAME = 'test-admin';
process.env.ADMIN_PASSWORD = 'test-admin-password';

const config = require('../../config');
assert.equal(config.mongodbUri, process.env.MONGODB_URI, 'Browser fixture must use its isolated database');
const app = require('../../server');
const { connectDatabase, disconnectDatabase } = require('../../config/database');
const User = require('../../models/User');
const Property = require('../../models/Property');

const baseUrl = 'http://127.0.0.1:3001';
const uploadsDirectory = path.join(config.publicDir, 'uploads');
const originalUploads = new Set();
const fixtureUploads = new Set();
let server;
let input;
let shutdownPromise;

function rememberFixtureUpload(url) {
    if (typeof url !== 'string' || !/^\/uploads\/[a-zA-Z0-9_.-]+$/.test(url)) return;
    const basename = path.basename(url);
    if (!originalUploads.has(basename)) fixtureUploads.add(path.resolve(uploadsDirectory, basename));
}

async function cleanup() {
    input?.close();
    if (server) {
        server.closeIdleConnections?.();
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
    try {
        if (mongoose.connection.readyState === 1) {
            assert.equal(mongoose.connection.name, databaseName, 'Refusing to drop an unexpected database');
            assert.match(databaseName, /^realestate_test_\d+_[a-f0-9]+$/);
            const listings = await Property.find().select('image images').lean();
            for (const listing of listings) {
                rememberFixtureUpload(listing.image);
                for (const image of listing.images || []) rememberFixtureUpload(image);
            }
            await mongoose.connection.dropDatabase();
        }
        for (const filename of fixtureUploads) {
            assert.equal(path.dirname(filename), path.resolve(uploadsDirectory));
            await fs.unlink(filename).catch(error => {
                if (error.code !== 'ENOENT') throw error;
            });
        }
        console.log(`Browser fixture cleaned up: ${databaseName}`);
    } finally {
        await disconnectDatabase();
    }
}

function stop() {
    if (!shutdownPromise) {
        shutdownPromise = cleanup().catch(error => {
            console.error('Browser fixture cleanup failed:', error.message);
            process.exitCode = 1;
        });
    }
    return shutdownPromise;
}

async function start() {
    const filenames = await fs.readdir(uploadsDirectory).catch(error => {
        if (error.code === 'ENOENT') return [];
        throw error;
    });
    for (const filename of filenames) originalUploads.add(filename);

    await connectDatabase();
    assert.equal(mongoose.connection.name, databaseName);
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    await User.create({
        username: 'test-buyer', email: 'buyer@example.test', password: 'buyer-password-123',
        role: 'user', status: 'approved', name: 'Test Buyer'
    });
    await User.create({
        username: 'test-agent', email: 'agent@example.test', password: 'agent-password-123',
        role: 'agent', status: 'approved', name: 'Test Agent', phone: '9876543210',
        licenseNumber: 'TEST-LICENSE-123', agentIdString: 'AGT9001'
    });
    server = await new Promise((resolve, reject) => {
        const listener = app.listen(3001, '127.0.0.1', () => resolve(listener));
        listener.once('error', reject);
    });

    const login = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'agent@example.test', password: 'agent-password-123' })
    });
    const auth = await login.json();
    assert.equal(login.status, 200, JSON.stringify(auth));

    const form = new FormData();
    for (const [key, value] of Object.entries({
        title: 'Garden View Family Home', location: 'Pune, Maharashtra', price: '7500000',
        type: 'House', beds: '3', baths: '2', agentContact: '9876543210',
        description: 'A spacious family home with a private garden, bright rooms, and convenient access to the city.'
    })) form.set(key, value);

    // Upload a copy through the API. Never attach an original user upload to a
    // disposable listing, because deleting that listing could delete the image.
    const sample = filenames.sort().find(filename => /^[a-zA-Z0-9_.-]+\.(jpg|jpeg|png)$/i.test(filename));
    if (sample) {
        const extension = path.extname(sample).toLowerCase();
        const bytes = await fs.readFile(path.join(uploadsDirectory, sample));
        form.append('images', new Blob([bytes], { type: extension === '.png' ? 'image/png' : 'image/jpeg' }), `browser-fixture${extension}`);
    }
    const created = await fetch(`${baseUrl}/api/properties`, {
        method: 'POST', headers: { Authorization: `Bearer ${auth.token}` }, body: form
    });
    const property = await created.json();
    assert.ok([200, 201].includes(created.status), JSON.stringify(property));
    rememberFixtureUpload(property.image);
    for (const image of property.images || []) rememberFixtureUpload(image);

    input = readline.createInterface({ input: process.stdin });
    input.on('line', line => {
        if (line.trim().toLowerCase() === 'stop') void stop();
    });
    console.log(`Browser fixture ready: ${baseUrl}`);
    console.log(`Isolated database: ${databaseName}`);
    console.log('Buyer: buyer@example.test / buyer-password-123');
    console.log('Agent: agent@example.test / agent-password-123');
    console.log('Admin: test-admin / test-admin-password');
    console.log("Send 'stop' on stdin or press Ctrl+C to clean up this fixture.");
}

process.once('SIGINT', stop);
process.once('SIGTERM', stop);
start().catch(async error => {
    console.error('Browser fixture startup failed:', error.message);
    process.exitCode = 1;
    await stop();
});
