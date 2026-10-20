const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { prepare, blockTree, richText, applicationSkills } = require('./import-mapped-questions.cjs');
const { importVocabulary, summarizeVocabulary } = require('./santa-vocabulary-topics.cjs');
const root = path.resolve(__dirname, '../../ednet_santa_mapping_clean');

function prepareLibraries() {
  const { rows } = prepare({ parts: [1, 2, 3, 4, 5, 6, 7] });
  const reading = new Map(), listening = new Map(), vocabulary = new Map(), lessons = new Map();
  for (const q of rows) {
    if (q.part === 7 && !q.imageUrl) {
      const key = `santa-reading:${q.provenance.contentId}`;
      if (!reading.has(key)) reading.set(key, { key, text: q.passage, title: `Santa Part 7 · ${q.passage.split('\n').find(s => s.trim())?.slice(0,100) || q.provenance.contentId}`, questions: [] });
      const stem = q.content.toLowerCase();
      reading.get(key).questions.push({ type: /purpose|mainly|primarily/.test(stem) ? 'PURPOSE' : /infer|suggest|impli|most likely/.test(stem) ? 'INFERENCE' : /meaning|means/.test(stem) ? 'PARAPHRASE' : 'DETAIL',
        prompt: q.content, options: q.choices, answer: 'ABCD'.indexOf(q.correctAnswer),
        explanation: q.explanation, evidenceRequired: false, evidence: [], sourceQuestionId: q.id, sourceQuestionPosition: q.stimulus?.questionPosition });
    }
    if (q.part <= 4 && q.audioUrl && !listening.has(q.audioUrl)) listening.set(q.audioUrl, {
      title: `Santa Part ${q.part} · ${q.part <= 2 ? q.content.slice(0,90) : `Bài nghe ${q.provenance.contentId}`}`, url: q.audioUrl,
    });
  }
  for (const book of reading.values()) {
    book.questions.sort((a,b) => (a.sourceQuestionPosition ?? Number.MAX_SAFE_INTEGER) - (b.sourceQuestionPosition ?? Number.MAX_SAFE_INTEGER));
    book.questions = book.questions.map(({ sourceQuestionPosition: _position, ...question }) => question);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/source_manifest.json'), 'utf8'));
  for (const entry of manifest.files.filter(f => f.path.endsWith('.json'))) {
    const raw = JSON.parse(fs.readFileSync(path.join(root, entry.path), 'utf8'));
    const meta = raw.oneOfDomainContent?.toeicContent;
    const typed = meta?.oneOfType;
    if (typed?.oneOfCase === 'VOCABULARY') {
      const v = typed.vocabulary;
      if (v?.id && v.word?.trim() && v.meaning?.trim()) vocabulary.set(v.id, {
        key: `santa-vocabulary:${v.id}`, word: v.word.trim(), sourcePos: v.pos, meaning: v.meaning.trim(),
        phonetic: v.phonemes || null, example: v.examples?.[0]?.text || null,
        notes: `Nguồn Santa: ${raw.baseContent.contentId}; ${entry.path}. Nghĩa và ví dụ từ bản crawl.`,
      });
    }
    if (typed?.oneOfCase === 'LESSON') {
      const lesson = typed.lesson;
      const text = richText(blockTree(lesson.body)).trim();
      if (!lesson.title || text.length < 100 || !/^p[1-7]$/.test(meta.part)) continue;
      const part = Number(meta.part.slice(1));
      const skills = applicationSkills({ question: lesson.title, part: meta.part, correct_text: '', choices: [''],
        features: { grammar: [meta.chapter, ...(meta.chapterList || []), ...(meta.sectionList || [])].filter(Boolean) } }, 1);
      if (!skills.length) continue;
      lessons.set(lesson.id, { marker: `[santa-lesson:${lesson.id}]`, title: lesson.title, part, skillCode: skills[0],
        content: `${text}\n\n${lesson.youtubeUrl ? `Video nguồn: ${lesson.youtubeUrl}\n` : ''}Nguồn Santa: ${entry.path}. Liên kết kỹ năng theo adapter, chưa duyệt độc lập.` });
    }
  }
  return { reading: [...reading.values()], listening: [...listening.values()], vocabulary: [...vocabulary.values()], lessons: [...lessons.values()] };
}

async function importLibraries(prisma, data) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(573107)::text`;
    const admin = await tx.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { id: 'asc' } });
    const owner = admin || await tx.user.findFirst({ orderBy: { id: 'asc' } });
    if (!owner) throw new Error('Cần ít nhất một tài khoản có sẵn để sở hữu thư mục từ vựng');
    const vocabularyImport = await importVocabulary(tx, data.vocabulary, owner.id);
    let vocabulary = vocabularyImport.created, reading = 0, listening = 0, lessons = 0;
    for (const book of data.reading) {
      if (await tx.readingArticle.findUnique({ where: { key: book.key } })) continue;
      const article = await tx.readingArticle.create({ data: { key: book.key, title: book.title, originalText: book.text, status: 'PUBLISHED' } });
      const version = await tx.readingVersion.create({ data: { articleId: article.id, revision: 1, title: book.title, text: book.text,
        topic: 'Santa TOEIC Part 7', kind: 'ARTICLE', difficulty: 'MEDIUM', origin: 'CRAWL', reviewed: false, questions: book.questions } });
      await tx.readingArticle.update({ where: { id: article.id }, data: { currentVersionId: version.id, publishedVersionId: version.id } }); reading++;
    }
    for (const audio of data.listening) {
      if (await tx.listeningSource.findFirst({ where: { url: audio.url, ownerId: null } })) continue;
      await tx.listeningSource.create({ data: { ...audio, kind: 'AUDIO', published: true } }); listening++;
    }
    const skillIds = new Map((await tx.skill.findMany()).map(s => [s.code, s.id]));
    for (const lesson of data.lessons) {
      if (!skillIds.has(lesson.skillCode) || await tx.theoryLesson.findFirst({ where: { content: { startsWith: lesson.marker } } })) continue;
      await tx.theoryLesson.create({ data: { title: lesson.title, part: lesson.part, skillId: skillIds.get(lesson.skillCode), content: `${lesson.marker}\n${lesson.content}` } }); lessons++;
    }
    return { vocabulary, reading, listening, lessons, vocabularyMoved: vocabularyImport.moved, vocabularyFolderIds: vocabularyImport.folders };
  }, { timeout: 300000 });
}

async function main() {
  const data = prepareLibraries();
  console.log(JSON.stringify({ prepared: Object.fromEntries(Object.entries(data).map(([k,v]) => [k,v.length])),
    vocabularyTopics: summarizeVocabulary(data.vocabulary),
    note: 'Listening sources have real audio; timed dictation still requires a genuine transcript. Reading uses source answer keys without fabricated evidence.' }));
  if (!process.argv.includes('--apply')) return;
  if (!process.env.DATABASE_URL) process.loadEnvFile(path.resolve(__dirname, '../.env'));
  const prisma = new PrismaClient();
  try { console.log(JSON.stringify({ created: await importLibraries(prisma, data) })); }
  finally { await prisma.$disconnect(); }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { prepareLibraries, importLibraries };
