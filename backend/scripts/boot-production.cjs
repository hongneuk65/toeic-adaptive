const { spawnSync } = require('node:child_process');
const { migrationEnvironment } = require('./migration-environment.cjs');
for (const [args, env] of [
  [['node_modules/prisma/build/index.js', 'migrate', 'deploy'], migrationEnvironment(process.env)],
  [['scripts/import-public-content.cjs', 'prisma/public-library.json.gz', '--if-empty'], process.env],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status || 1);
}
require('../dist/main.js');
