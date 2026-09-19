const fs = require('node:fs');
const path = require('node:path');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);

function required(name, minimumLength = 1) {
  const value = process.env[name];
  if (!value || value.trim().length < minimumLength || value.startsWith('replace-with-')) {
    throw new Error(`${name} must be configured${minimumLength > 1 ? ` with at least ${minimumLength} characters` : ''}. Run npm run setup for local development, or set your environment variables.`);
  }
  return value;
}

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');

module.exports = {
  port,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/realestate',
  jwtSecret: required('JWT_SECRET', 32),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  adminUsername: required('ADMIN_USERNAME'),
  // Keep local development compatible with existing 8+ character credentials while
  // still rejecting placeholder or missing administrator passwords.
  adminPassword: required('ADMIN_PASSWORD', 8),
  production: process.env.NODE_ENV === 'production',
  publicDir: path.join(__dirname, '..', 'public')
};
