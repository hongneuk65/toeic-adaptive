// One-off data repair: blank optional media text becomes NULL so "has media" filters are reliable.
// Dry run by default; pass --write to apply. Fingerprints used by DAS3H exclude these columns.
require('../dist/config/environment');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const write = process.argv.includes('--write');
const columns = ['passage', 'audioUrl', 'imageUrl'];
(async () => {
  for (const column of columns) {
    const [{ count }] = await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "Question" WHERE "${column}" IS NOT NULL AND btrim("${column}") = ''`);
    let updated = 0;
    if (write && count) updated = await db.$executeRawUnsafe(`UPDATE "Question" SET "${column}" = NULL WHERE "${column}" IS NOT NULL AND btrim("${column}") = ''`);
    console.log(JSON.stringify({ column, blank: count, updated, dryRun: !write }));
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
