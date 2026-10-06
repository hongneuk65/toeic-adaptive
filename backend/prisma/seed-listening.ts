import { PrismaClient } from '@prisma/client';
import units from './listening-demo.json';
const prisma = new PrismaClient();
async function main() {
  let source = await prisma.listeningSource.findFirst({ where: { url: '/listening-demo.wav', ownerId: null } });
  source ??= await prisma.listeningSource.create({ data: { title: 'Office announcements · bài mẫu', kind: 'AUDIO', url: '/listening-demo.wav', published: true } });
  const existing = await prisma.listeningTranscript.findFirst({ where: { sourceId: source.id, version: 'office-demo-v1' } });
  if (!existing) await prisma.listeningTranscript.create({ data: { sourceId: source.id, version: 'office-demo-v1', provider: 'demo', status: 'READY', units: { create: units.map((cue, position) => ({ ...cue, position })) } } });
  console.log(`Listening demo source #${source.id}; ${units.length} timed sentences. No DAS3H changes.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
