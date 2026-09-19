const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const uploadsDir = path.resolve(__dirname, '../public/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
const imageTypes = new Map([
    ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
    ['.png', 'image/png'], ['.gif', 'image/gif'], ['.webp', 'image/webp']
]);
const storage = multer.diskStorage({
    destination(req, file, callback) { callback(null, uploadsDir); },
    filename(req, file, callback) { callback(null, 'images-' + randomUUID() + path.extname(file.originalname).toLowerCase()); }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 10, fields: 20, fieldSize: 32 * 1024 },
    fileFilter(req, file, callback) {
        const extension = path.extname(file.originalname).toLowerCase();
        if (imageTypes.get(extension) !== file.mimetype) return callback(Object.assign(new Error('Upload JPG, PNG, GIF, or WebP images only'), { status: 400 }));
        callback(null, true);
    }
}).array('images', 10);

// Only remove files created by this request, never existing listing images.
upload.cleanup = async function cleanup(files = []) {
    await Promise.all(files.map(async file => {
        if (typeof file.path !== 'string' || path.dirname(path.resolve(file.path)) !== uploadsDir) return;
        try { await fs.promises.unlink(file.path); }
        catch (error) { if (error.code !== 'ENOENT') console.error('Unable to remove failed upload:', error.code); }
    }));
};
module.exports = upload;
