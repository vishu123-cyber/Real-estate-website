const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');

function createImageStorage({ env = process.env, blobClient, directory = path.resolve(__dirname, '../public/uploads') } = {}) {
    const useBlob = () => Boolean(env.VERCEL || env.BLOB_READ_WRITE_TOKEN || env.BLOB_STORE_ID);
    const client = () => blobClient || import('@vercel/blob');
    async function store(files = []) {
        if (!files.length) return [];
        if (useBlob() && !env.BLOB_READ_WRITE_TOKEN && !env.BLOB_STORE_ID) {
            throw Object.assign(new Error('Image storage is not configured. Connect a public Vercel Blob store to this project and redeploy.'), { status: 503 });
        }
        for (const file of files) {
            const filename = 'images-' + randomUUID() + path.extname(file.originalname).toLowerCase();
            if (useBlob()) {
                const { put } = await client();
                const blob = await put('luxeestate/properties/' + filename, file.buffer, {
                    access: 'public', contentType: file.mimetype, addRandomSuffix: false
                });
                file.storedUrl = blob.url;
            } else {
                await fs.mkdir(directory, { recursive: true });
                file.path = path.join(directory, filename);
                await fs.writeFile(file.path, file.buffer, { flag: 'wx' });
                file.storedUrl = '/uploads/' + filename;
            }
        }
        return files.map(file => file.storedUrl);
    }
    async function remove(urls = []) {
        await Promise.all([...new Set(urls)].map(async value => {
            try {
                if (useBlob()) {
                    const url = new URL(value);
                    if (url.protocol !== 'https:' || !url.hostname.endsWith('.public.blob.vercel-storage.com') || !url.pathname.startsWith('/luxeestate/properties/images-')) return;
                    const { del } = await client();
                    await del(value);
                } else if (/^\/uploads\/images-[a-f0-9-]{36}\.(jpg|jpeg|png|gif|webp)$/i.test(value)) {
                    await fs.unlink(path.join(directory, path.basename(value)));
                }
            } catch (error) {
                if (error.code !== 'ENOENT' && error.code !== 'ERR_INVALID_URL') console.error('Image cleanup failed:', error.name);
            }
        }));
    }
    return { store, remove, cleanup: files => remove((files || []).map(file => file.storedUrl).filter(Boolean)) };
}

module.exports = createImageStorage();
module.exports.createImageStorage = createImageStorage;
