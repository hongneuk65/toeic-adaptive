// Local export for training. Contains pseudonymous learner IDs; never commit output.
require('../dist/config/environment');
const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const { dirname } = require('node:path');
const { createHash } = require('node:crypto');
const db = new PrismaClient();
async function main() {
  const destination = process.argv[2];
  if (!destination) throw new Error('Usage: node scripts/export-hlr.cjs <output.json>');
  const rows = await db.flashcardRecallEvent.findMany({ where: { recallMode: 'typed', lagDays: { gte: 10 / 1440 } }, include: { review: { select: { userId: true, cardId: true } } }, orderBy: { occurredAt: 'asc' } });
  const exported = rows.map(row => ({ learner: createHash('sha256').update(`hlr:${row.review.userId}`).digest('hex'), item: row.contentHash, wins: row.priorWins, losses: row.priorLosses, lagDays: row.lagDays, correct: Number(row.correct), occurredAt: row.occurredAt.toISOString() }));
  fs.mkdirSync(dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(exported, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ exported: exported.length, destination }));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
