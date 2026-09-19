// Retained as a compatibility entry point; all test accounts are isolated.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const result = spawnSync(process.execPath, ['--test', path.join(__dirname, 'test/integration.test.js')], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
