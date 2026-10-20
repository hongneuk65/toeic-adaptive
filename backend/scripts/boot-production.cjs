const { spawnSync } = require('node:child_process');
for (const args of [
  ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
  ['scripts/import-public-content.cjs', 'prisma/public-library.json.gz', '--if-empty'],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
require('../dist/main.js');
