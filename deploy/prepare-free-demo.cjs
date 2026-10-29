const { cpSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const root = resolve(__dirname, '..');
if (!existsSync(resolve(root, 'frontend/dist/index.html'))) throw new Error('Build frontend first');
const result = spawnSync(process.execPath, ['backend/scripts/fetch-demo-assets.cjs'], { cwd: root, stdio: 'inherit', env: process.env });
if (result.status !== 0) process.exit(result.status || 1);
cpSync(resolve(root, 'frontend/dist'), resolve(root, 'backend/public'), { recursive: true });
console.log('Free demo application and verified library ready.');
