const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');

// Every run gets a disposable database. Never connect these tests to realestate.
const databaseName = `realestate_test_${Date.now()}_${randomBytes(5).toString('hex')}`;
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${databaseName}`;
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.ADMIN_USERNAME = 'test-admin';
process.env.ADMIN_PASSWORD = 'test-admin-password';

assert.equal(require('../config').mongodbUri, process.env.MONGODB_URI, 'Configuration must preserve the isolated test database URI');
const app = require('../server');
const { connectDatabase, disconnectDatabase } = require('../config/database');

test('real estate API works end to end using an isolated test database', { timeout: 120_000 }, async (t) => {
    let server;
    let baseUrl;
    const uploadedPaths = new Set();
    const uploadsDirectory = path.resolve(__dirname, '../public/uploads');

    t.after(async () => {
        try {
            if (server) {
                server.closeIdleConnections?.();
                await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
            }
            for (const filename of uploadedPaths) {
                await fs.unlink(filename).catch(error => {
                    if (error.code !== 'ENOENT') throw error;
                });
            }
        } finally {
            try {
                if (mongoose.connection.readyState === 1) {
                    assert.equal(mongoose.connection.name, databaseName, 'Refusing to drop an unexpected database');
                    assert.match(databaseName, /^realestate_test_\d+_[a-f0-9]+$/);
                    await mongoose.connection.dropDatabase();
                }
            } finally {
                await disconnectDatabase();
            }
        }
    });

    await connectDatabase();
    assert.equal(mongoose.connection.name, databaseName, 'Tests must use their own database');
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    server = await new Promise((resolve, reject) => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
        listener.once('error', reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    async function request(method, route, { token, body, form } = {}) {
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        const response = await fetch(`${baseUrl}${route}`, {
            method,
            headers,
            body: form || (body === undefined ? undefined : JSON.stringify(body)),
            signal: AbortSignal.timeout(15_000)
        });
        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            assert.fail(`${method} ${route} returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
        }
        return { status: response.status, data };
    }

    function expectStatus(result, ...expected) {
        assert.ok(expected.includes(result.status), `Expected HTTP ${expected.join(' or ')}, got ${result.status}: ${JSON.stringify(result.data)}`);
        return result.data;
    }

    function expectError(result, ...expected) {
        const data = expectStatus(result, ...expected);
        assert.ok(typeof data?.error === 'string' || typeof data?.message === 'string', 'Errors should include a useful message');
    }

    const userCredentials = { username: 'test-buyer', email: 'buyer@example.test', password: 'buyer-password-123' };
    const agentCredentials = {
        username: 'test-agent', email: 'agent@example.test', password: 'agent-password-123',
        role: 'agent', name: 'Test Agent', phone: '9876543210', licenseNumber: 'TEST-LICENSE-123'
    };
    let userToken;
    let adminToken;
    let agentToken;
    let otherAgentToken;
    let agentId;
    let otherAgentId;
    let ownedProperty;
    let otherProperty;
    let unownedProperty;
    const missingId = new mongoose.Types.ObjectId().toString();

    await t.test('health and static frontend are served', async () => {
        const health = expectStatus(await request('GET', '/api/health'), 200);
        assert.equal(health.status, 'ok');
        assert.equal(health.database, 'connected');
        const home = await fetch(`${baseUrl}/`);
        assert.equal(home.status, 200);
        assert.match(home.headers.get('content-type'), /text\/html/);
        assert.match(await home.text(), /<html/i);
        expectError(await request('GET', '/api/route-that-does-not-exist'), 404);
    });

    await t.test('buyers register, log in, and receive safe validation errors', async () => {
        const registered = expectStatus(await request('POST', '/api/auth/signup', { body: userCredentials }), 201);
        assert.equal(registered.role, 'user');
        assert.ok(registered.token);
        assert.equal(registered.password, undefined);
        userToken = registered.token;

        expectError(await request('POST', '/api/auth/signup', {
            body: { ...userCredentials, username: ` ${userCredentials.username} `, email: ' BUYER@EXAMPLE.TEST ' }
        }), 400, 409);
        const loggedIn = expectStatus(await request('POST', '/api/auth/login', {
            body: { email: ' BUYER@EXAMPLE.TEST ', password: userCredentials.password }
        }), 200);
        assert.equal(loggedIn.username, userCredentials.username);
        assert.ok(loggedIn.token);
        expectError(await request('POST', '/api/auth/login', { body: { email: userCredentials.email, password: 'wrong-password' } }), 401);
        expectError(await request('POST', '/api/auth/login', { body: { email: userCredentials.email } }), 400);
        expectError(await request('POST', '/api/auth/signup', {
            body: { username: 'bad-role', email: 'bad-role@example.test', password: 'password-123', role: 'admin' }
        }), 400);
        expectError(await request('POST', '/api/auth/signup', {
            body: { username: 'bad-email', email: 'not-an-email', password: 'password-123' }
        }), 400);
        expectError(await request('POST', '/api/auth/signup', {
            body: { username: 'bad-password', email: 'short@example.test', password: '123' }
        }), 400);
        expectError(await request('GET', '/api/favorites'), 401);
        expectError(await request('GET', '/api/favorites', { token: 'invalid-token' }), 401);
        expectError(await request('GET', '/api/admin/agents', { token: userToken }), 403);
    });

    await t.test('admins approve agents before agents can sign in', async () => {
        expectError(await request('POST', '/api/admin/login', { body: { username: 'test-admin', password: 'incorrect' } }), 401);
        const admin = expectStatus(await request('POST', '/api/admin/login', {
            body: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }
        }), 200);
        adminToken = admin.token;
        assert.ok(adminToken);
        const pending = expectStatus(await request('POST', '/api/auth/signup', { body: agentCredentials }), 201);
        assert.equal(pending.isPending, true);
        assert.equal(pending.token, undefined);
        expectError(await request('POST', '/api/auth/login', { body: agentCredentials }), 401, 403);
        const pendingAgents = expectStatus(await request('GET', '/api/admin/pending-agents', { token: adminToken }), 200);
        const agent = pendingAgents.find(account => account.email === agentCredentials.email);
        assert.ok(agent);
        assert.equal(agent.password, undefined);
        agentId = agent._id;
        const approval = expectStatus(await request('PUT', `/api/admin/approve-agent/${agentId}`, { token: adminToken }), 200);
        assert.equal(approval.agent?.password, undefined);
        const approved = expectStatus(await request('POST', '/api/auth/login', { body: agentCredentials }), 200);
        assert.equal(approved.role, 'agent');
        assert.match(approved.agentIdString, /^AGT/);
        agentToken = approved.token;

        const otherCredentials = { ...agentCredentials, username: 'other-agent', email: 'other-agent@example.test', licenseNumber: 'TEST-LICENSE-456' };
        expectStatus(await request('POST', '/api/auth/signup', { body: otherCredentials }), 201);
        const agents = expectStatus(await request('GET', '/api/admin/pending-agents', { token: adminToken }), 200);
        otherAgentId = agents.find(account => account.email === otherCredentials.email)._id;
        expectStatus(await request('PUT', `/api/admin/approve-agent/${otherAgentId}`, { token: adminToken }), 200);
        otherAgentToken = expectStatus(await request('POST', '/api/auth/login', { body: otherCredentials }), 200).token;
        expectError(await request('PUT', '/api/admin/approve-agent/not-an-id', { token: adminToken }), 400);
        expectError(await request('PUT', `/api/admin/approve-agent/${missingId}`, { token: adminToken }), 404);
    });

    function propertyBody(overrides = {}) {
        return {
            title: 'Integration Test House', location: 'Test [Town]', price: 250000,
            type: 'House', description: 'A property created by the isolated integration test.',
            beds: 3, baths: 2, agentContact: '9876543210',
            image: 'https://example.test/house.jpg', ...overrides
        };
    }

    await t.test('property CRUD, filters, ownership, and administrator listing creation work', async () => {
        expectError(await request('POST', '/api/properties', { body: propertyBody() }), 401);
        expectError(await request('POST', '/api/properties', { token: userToken, body: propertyBody() }), 403);
        expectError(await request('POST', '/api/properties', { token: agentToken, body: { title: '' } }), 400);
        expectError(await request('POST', '/api/properties', { token: agentToken, body: propertyBody({ price: -1 }) }), 400);
        expectError(await request('POST', '/api/properties', { token: agentToken, body: propertyBody({ type: 'InvalidType' }) }), 400);
        ownedProperty = expectStatus(await request('POST', '/api/properties', { token: agentToken, body: propertyBody() }), 200, 201);
        assert.equal(ownedProperty.agentId, agentId);
        otherProperty = expectStatus(await request('POST', '/api/properties', {
            token: otherAgentToken, body: propertyBody({ title: 'Other Agent Apartment', location: 'Elsewhere', type: 'Apartment', price: 500000 })
        }), 200, 201);
        unownedProperty = expectStatus(await request('POST', '/api/properties', {
            token: adminToken, body: propertyBody({ title: 'Admin Listing', location: 'Elsewhere', type: 'Villa', price: 750000 })
        }), 200, 201);
        assert.ok(!unownedProperty.agentId, 'Admin listings can be created without an agent');

        const detail = expectStatus(await request('GET', `/api/properties/${ownedProperty._id}`), 200);
        assert.equal(detail.title, ownedProperty.title);
        assert.equal(detail.agentId._id, agentId);
        assert.equal(detail.agentId.password, undefined);
        const filtered = expectStatus(await request('GET', '/api/properties?location=town&type=House&maxPrice=300000'), 200);
        assert.deepEqual(filtered.map(property => property._id), [ownedProperty._id]);
        const literalLocation = expectStatus(await request('GET', '/api/properties?location=%5B'), 200);
        assert.deepEqual(literalLocation.map(property => property._id), [ownedProperty._id]);
        expectError(await request('GET', '/api/properties?maxPrice=not-a-number'), 400);
        expectError(await request('GET', '/api/properties/not-an-id'), 400);
        expectError(await request('GET', `/api/properties/${missingId}`), 404);

        for (const property of [ownedProperty, unownedProperty]) {
            expectError(await request('PUT', `/api/properties/${property._id}`, { token: otherAgentToken, body: { title: 'Unauthorized edit' } }), 403);
            expectError(await request('DELETE', `/api/properties/${property._id}`, { token: otherAgentToken }), 403);
        }
        const updated = expectStatus(await request('PUT', `/api/properties/${ownedProperty._id}`, {
            token: agentToken, body: { title: 'Updated House', price: 260000 }
        }), 200);
        assert.equal(updated.title, 'Updated House');
        assert.equal(updated.price, 260000);
        const adminUpdated = expectStatus(await request('PUT', `/api/properties/${ownedProperty._id}`, {
            token: adminToken, body: { description: 'Reviewed by administrator.' }
        }), 200);
        assert.equal(adminUpdated.agentId, agentId);
        const ownListings = expectStatus(await request('GET', '/api/agent/properties', { token: agentToken }), 200);
        assert.deepEqual(ownListings.map(property => property._id), [ownedProperty._id]);
    });

    await t.test('favorites validate existence and repeated additions and removals are safe', async () => {
        expectError(await request('POST', '/api/favorites/not-an-id', { token: userToken }), 400);
        expectError(await request('POST', `/api/favorites/${missingId}`, { token: userToken }), 404);
        expectStatus(await request('POST', `/api/favorites/${ownedProperty._id}`, { token: userToken }), 200, 201);
        expectStatus(await request('POST', `/api/favorites/${ownedProperty._id}`, { token: userToken }), 200, 201);
        const favorites = expectStatus(await request('GET', '/api/favorites', { token: userToken }), 200);
        assert.deepEqual(favorites.map(property => property._id), [ownedProperty._id]);
        expectStatus(await request('DELETE', `/api/favorites/${ownedProperty._id}`, { token: userToken }), 200);
        expectStatus(await request('DELETE', `/api/favorites/${ownedProperty._id}`, { token: userToken }), 200);
        assert.deepEqual(expectStatus(await request('GET', '/api/favorites', { token: userToken }), 200), []);
        expectStatus(await request('POST', `/api/favorites/${ownedProperty._id}`, { token: userToken }), 200, 201);
    });

    await t.test('general and property inquiries reach the correct inboxes', async () => {
        const contact = { name: 'Interested Buyer', email: 'contact@example.test', message: 'Please share more information.' };
        expectStatus(await request('POST', '/api/properties/messages', { body: contact }), 200, 201);
        expectStatus(await request('POST', '/api/properties/messages', { body: { ...contact, propertyId: ownedProperty._id } }), 200, 201);
        expectStatus(await request('POST', '/api/properties/messages', { body: { ...contact, propertyId: otherProperty._id } }), 200, 201);
        expectError(await request('POST', '/api/properties/messages', { body: { ...contact, email: 'invalid' } }), 400);
        expectError(await request('POST', '/api/properties/messages', { body: { ...contact, message: '   ' } }), 400);
        expectError(await request('POST', '/api/properties/messages', { body: { ...contact, propertyId: 'invalid-id' } }), 400);
        expectError(await request('POST', '/api/properties/messages', { body: { ...contact, propertyId: missingId } }), 404);
        const adminMessages = expectStatus(await request('GET', '/api/admin/messages', { token: adminToken }), 200);
        assert.equal(adminMessages.length, 3);
        const agentMessages = expectStatus(await request('GET', '/api/agent/messages', { token: agentToken }), 200);
        assert.equal(agentMessages.length, 1);
        assert.equal(agentMessages[0].propertyId._id, ownedProperty._id);
        const otherMessages = expectStatus(await request('GET', '/api/agent/messages', { token: otherAgentToken }), 200);
        assert.equal(otherMessages.length, 1);
        assert.equal(otherMessages[0].propertyId._id, otherProperty._id);
        expectError(await request('GET', '/api/admin/messages', { token: agentToken }), 403);
        expectError(await request('GET', '/api/agent/messages', { token: userToken }), 403);
        const generalMessage = adminMessages.find(message => !message.propertyId);
        assert.ok(generalMessage);
        expectStatus(await request('DELETE', `/api/admin/messages/${generalMessage._id}`, { token: adminToken }), 200);
        expectError(await request('DELETE', `/api/admin/messages/${generalMessage._id}`, { token: adminToken }), 404);
    });

    await t.test('image uploads are served and non-image files are rejected', async () => {
        const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64');
        const form = new FormData();
        for (const [key, value] of Object.entries(propertyBody({ title: 'Upload Test House' }))) {
            if (key !== 'image') form.set(key, String(value));
        }
        form.append('images', new Blob([png], { type: 'image/png' }), 'integration-test.png');
        const uploaded = expectStatus(await request('POST', '/api/properties', { token: agentToken, form }), 200, 201);
        for (const image of uploaded.images || []) {
            assert.match(image, /^\/uploads\/[a-zA-Z0-9_.-]+$/);
            const filename = path.resolve(uploadsDirectory, path.basename(image));
            assert.equal(path.dirname(filename), uploadsDirectory);
            uploadedPaths.add(filename);
        }
        assert.equal(uploadedPaths.size, 1);
        assert.equal(uploaded.image, uploaded.images[0]);
        const downloaded = await fetch(`${baseUrl}${uploaded.image}`);
        assert.equal(downloaded.status, 200);
        assert.match(downloaded.headers.get('content-type'), /image\/png/);
        assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), png);

        const invalid = new FormData();
        for (const [key, value] of Object.entries(propertyBody())) invalid.set(key, String(value));
        invalid.append('images', new Blob(['This is not an image'], { type: 'text/plain' }), 'integration-test.txt');
        expectError(await request('POST', '/api/properties', { token: agentToken, form: invalid }), 400);
        expectStatus(await request('DELETE', `/api/properties/${uploaded._id}`, { token: agentToken }), 200);
    });

    await t.test('agent rejection revokes existing access and deleting a listing cleans favorites', async () => {
        expectStatus(await request('PUT', `/api/admin/reject-agent/${agentId}`, { token: adminToken }), 200);
        expectError(await request('POST', '/api/auth/login', { body: agentCredentials }), 401, 403);
        expectError(await request('GET', '/api/agent/properties', { token: agentToken }), 401, 403);
        expectError(await request('POST', '/api/properties', { token: agentToken, body: propertyBody() }), 401, 403);
        expectStatus(await request('DELETE', `/api/properties/${ownedProperty._id}`, { token: adminToken }), 200);
        expectError(await request('GET', `/api/properties/${ownedProperty._id}`), 404);
        assert.deepEqual(expectStatus(await request('GET', '/api/favorites', { token: userToken }), 200), []);
        expectStatus(await request('DELETE', `/api/properties/${otherProperty._id}`, { token: otherAgentToken }), 200);
        expectStatus(await request('DELETE', `/api/properties/${unownedProperty._id}`, { token: adminToken }), 200);
        assert.deepEqual(expectStatus(await request('GET', '/api/properties'), 200), []);
    });
});
