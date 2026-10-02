const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const upload = require('../middleware/upload');
const { createImageStorage } = require('../services/imageStorage');
const file = () => ({ originalname: 'home.JPG', mimetype: 'image/jpeg', buffer: Buffer.from('test photo'), size: 10 });

test('Blob uploads return public URLs and failed requests delete only newly stored files', async () => {
    const calls = [], deleted = [];
    const storage = createImageStorage({ env: { VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'test' }, blobClient: {
        async put(name, buffer, options) {
            calls.push({ name, buffer, options });
            if (calls.length === 2) throw new Error('upload failed');
            return { url: 'https://example.public.blob.vercel-storage.com/' + name };
        },
        async del(url) { deleted.push(url); }
    } });
    const files = [file(), file()];
    await assert.rejects(storage.store(files), /upload failed/);
    await storage.cleanup(files);
    assert.deepEqual(deleted, [files[0].storedUrl]);
    assert.equal(calls[0].options.access, 'public');
    assert.equal(calls[0].options.contentType, 'image/jpeg');
    assert.match(calls[0].name, /^luxeestate\/properties\/images-[a-f0-9-]+\.jpg$/);
    await storage.remove(['https://example.com/photo.jpg', '/uploads/existing.jpg']);
    assert.equal(deleted.length, 1);
});

test('Vercel without a Blob store reports setup error instead of writing to disk', async () => {
    const storage = createImageStorage({ env: { VERCEL: '1' } });
    await assert.rejects(storage.store([file()]), error => error.status === 503);
    assert.deepEqual(await storage.store([]), []);
});

test('a connected Blob store returns durable URLs without local filesystem writes', async () => {
    const deleted = [];
    const storage = createImageStorage({ env: { VERCEL: '1', BLOB_STORE_ID: 'store_test' }, blobClient: {
        async put(name) { return { url: 'https://example.public.blob.vercel-storage.com/' + name }; },
        async del(url) { deleted.push(url); }
    } });
    const files = [file()];
    const urls = await storage.store(files);
    assert.equal(urls[0], files[0].storedUrl);
    assert.equal(files[0].path, undefined);
    await storage.remove(urls);
    assert.deepEqual(deleted, urls);
});

test('local uploads remain available without Blob credentials', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'estate-upload-'));
    try {
        const storage = createImageStorage({ env: {}, directory });
        const files = [file()];
        const urls = await storage.store(files);
        assert.match(urls[0], /^\/uploads\/images-/);
        assert.deepEqual(await fs.readFile(files[0].path), files[0].buffer);
        await storage.cleanup(files);
        assert.equal((await fs.readdir(directory)).length, 0);
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('multipart parser keeps images in memory and enforces type and total size', async () => {
    const app = express();
    app.post('/', upload, (req, res) => res.json({ files: req.files.length, buffered: Buffer.isBuffer(req.files[0].buffer), diskPath: req.files[0].path || null }));
    app.use((error, req, res, next) => res.status(error.status || 400).json({ error: error.message }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const url = 'http://127.0.0.1:' + server.address().port;
    try {
        const form = new FormData();
        form.append('images', new Blob(['photo'], { type: 'image/jpeg' }), 'home.jpg');
        const response = await fetch(url, { method: 'POST', body: form });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { files: 1, buffered: true, diskPath: null });
        const invalid = new FormData();
        invalid.append('images', new Blob(['file'], { type: 'text/plain' }), 'home.txt');
        assert.equal((await fetch(url, { method: 'POST', body: invalid })).status, 400);
        const large = new FormData();
        large.append('images', new Blob([Buffer.alloc(3 * 1024 * 1024)], { type: 'image/jpeg' }), 'one.jpg');
        large.append('images', new Blob([Buffer.alloc(2 * 1024 * 1024)], { type: 'image/jpeg' }), 'two.jpg');
        assert.equal((await fetch(url, { method: 'POST', body: large })).status, 413);
    } finally { await new Promise(resolve => server.close(resolve)); }
});
