const multer = require('multer');
const path = require('path');
const images = require('../services/imageStorage');

const maxTotalBytes = 4 * 1024 * 1024;
const imageTypes = new Map([
    ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
    ['.png', 'image/png'], ['.gif', 'image/gif'], ['.webp', 'image/webp']
]);
const parse = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxTotalBytes, files: 10, fields: 20, fieldSize: 32 * 1024 },
    fileFilter(req, file, callback) {
        const extension = path.extname(file.originalname).toLowerCase();
        if (imageTypes.get(extension) !== file.mimetype) return callback(Object.assign(new Error('Upload JPG, PNG, GIF, or WebP images only'), { status: 400 }));
        callback(null, true);
    }
}).array('images', 10);

function upload(req, res, next) {
    if (Number(req.headers['content-length']) > maxTotalBytes + 128 * 1024) {
        return next(Object.assign(new Error('Choose images totaling 4 MB or less per save.'), { status: 413 }));
    }
    parse(req, res, error => {
        if (!error && (req.files || []).reduce((sum, file) => sum + file.size, 0) > maxTotalBytes) {
            error = Object.assign(new Error('Choose images totaling 4 MB or less per save.'), { status: 413 });
        }
        next(error);
    });
}
upload.store = images.store;
upload.cleanup = images.cleanup;
upload.remove = images.remove;
module.exports = upload;
