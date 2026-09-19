const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

// Development convenience only. Production must supply its own configuration.
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(__dirname, '..', '.env');
  try {
    fs.writeFileSync(envPath, [
      'NODE_ENV=development',
      'PORT=3000',
      'MONGODB_URI=mongodb://127.0.0.1:27017/realestate',
      `JWT_SECRET=${randomBytes(48).toString('hex')}`,
      'JWT_EXPIRES_IN=1d',
      'ADMIN_USERNAME=admin',
      `ADMIN_PASSWORD=${randomBytes(18).toString('base64url')}`,
      ''
    ].join('\n'), { flag: 'wx', mode: 0o600 });
    console.log('Created local .env with random JWT and admin secrets.');
    console.log('Your admin username and password are in .env beside server.js.');
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}
