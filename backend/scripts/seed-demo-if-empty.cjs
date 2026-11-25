// Nạp dữ liệu mẫu tổng hợp khi cơ sở dữ liệu chưa có nội dung và không có tệp thư viện học.
// Dùng cho bản lấy từ GitHub; bản ZIP nộp kèm khóa luận nạp thư viện thật bằng import-public-content.cjs.
const { PrismaClient } = require('@prisma/client');
const { spawnSync } = require('node:child_process');

const seeds = ['seed-skills', 'seed-weights', 'seed-theory', 'seed-knowledge', 'seed-questions-bulk', 'seed-listening'];
const compiler = JSON.stringify({ module: 'commonjs', moduleResolution: 'node', ignoreDeprecations: '6.0', target: 'es2022', esModuleInterop: true, resolveJsonModule: true });

(async () => {
  const db = new PrismaClient();
  const hasContent = (await db.question.count()) > 0 || (await db.skill.count()) > 0;
  await db.$disconnect();
  if (hasContent) return console.log('Existing content retained; demo seed skipped.');
  for (const seed of seeds) {
    const result = spawnSync(process.execPath, [require.resolve('ts-node/dist/bin.js'), '--skip-project', '--transpile-only', '-O', compiler, `prisma/${seed}.ts`], { stdio: 'inherit', env: process.env });
    if (result.status !== 0) throw new Error(`${seed} failed`);
  }
  console.log('Demo content seeded (synthetic questions; use the thesis ZIP for the real learning library).');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
