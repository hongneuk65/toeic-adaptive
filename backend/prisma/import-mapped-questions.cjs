const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const { PrismaClient } = require('@prisma/client');
const { mediaIndex } = require('./santa-media.cjs');
const { stimulusFor } = require('./santa-stimulus.cjs');
const root = path.resolve(__dirname, '../../ednet_santa_mapping_clean');
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

// Explicit adapter from Santa grammar metadata to the application's existing skills.
const skillMap = {
  pronouns: 'P5_SUBJECT_VERB_AGREE', 'source:agreement': 'P5_SUBJECT_VERB_AGREE',
  'source:verb_agreement': 'P5_SUBJECT_VERB_AGREE', 'source:determinor_noun_agreement': 'P5_SUBJECT_VERB_AGREE',
  tenses: 'P5_VERB_TENSES_VOICE', voice: 'P5_VERB_TENSES_VOICE',
  relative: 'P5_RELATIVE_CLAUSES', connectives: 'P5_CONNECTORS_CONJ', preposition: 'P5_CONNECTORS_CONJ',
  word_position: 'P5_PARTS_OF_SPEECH', infinitive: 'P5_PARTS_OF_SPEECH',
  participle: 'P5_PARTS_OF_SPEECH', gerund: 'P5_PARTS_OF_SPEECH',
  'source:modal_auxiliary_verbs': 'P5_SUBJUNCTIVE_MODAL',
  vocab_verb: 'P5_CONTEXT_VOCAB', vocab_noun: 'P5_CONTEXT_VOCAB',
  vocab_adjective: 'P5_CONTEXT_VOCAB', vocab_adverb: 'P5_CONTEXT_VOCAB',
};

function richText(node) {
  if (Array.isArray(node)) {
    if (node[0] === 'blank') return ' ------- ';
    if (node[0] === 'text') return node[1]?.value || '';
    if (typeof node[0] === 'string' && node[1] && typeof node[1] === 'object') {
      return richText(node[1]) + (['paragraph', 'table'].includes(node[0]) ? '\n' : '');
    }
    return node.map(richText).join('');
  }
  if (node && typeof node === 'object') return Object.values(node).filter(v => v && typeof v === 'object').map(richText).join('');
  return '';
}

function blockTree(block) {
  const data = block?.oneOfData || {};
  for (const [key, value] of Object.entries(data)) if (key.endsWith('Json') && value) return JSON.parse(value);
  return { children: [['text', { value: data.text || '' }]] };
}

function imageRefs(node) {
  if (Array.isArray(node)) {
    if (node[0] === 'image') return [node[1]?.src].filter(Boolean);
    return node.flatMap(imageRefs);
  }
  if (node && typeof node === 'object') return Object.values(node).flatMap(imageRefs);
  return [];
}

function labelBlanks(node, state = { number: 0 }) {
  if (Array.isArray(node)) {
    if (node[0] === 'blank') { state.number++; return ['text', { value: ` [${state.number}] ------- ` }]; }
    return node.map(child => labelBlanks(child, state));
  }
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, labelBlanks(value, state)]));
  return node;
}

function applicationSkills(q, passages) {
  const stem = q.question.toLowerCase();
  const grammar = q.features.grammar;
  if (q.part === 'p5') return [...new Set(grammar.map(f => skillMap[f]).filter(Boolean))];
  if (q.part === 'p1') {
    const answer = q.correct_text.toLowerCase();
    if (/\b(standing|sitting|behind|beside|next to|near)\b/.test(answer)) return ['P1_PHOTO_LOCATION'];
    if (/\b(being|been)\b/.test(answer)) return ['P1_PHOTO_PASSIVE'];
    if (/\b(man|woman|people|person|men|women|worker)\b.*\b\w+ing\b/.test(answer)) return ['P1_PHOTO_ACTION'];
    return ['P1_PHOTO_OBJECT'];
  }
  if (q.part === 'p2') {
    if (/\bor\b/.test(stem)) return ['P2_CHOICE_QUESTIONS'];
    if (/^(who|what|where|when|why|how|which)\b/.test(stem)) return ['P2_WH_QUESTIONS'];
    if (/^(is|are|was|were|do|does|did|has|have|had|can|could|will|would|should|may|must)\b/.test(stem)) return ['P2_YES_NO_QUESTIONS'];
    return ['P2_STATEMENT_RESPONSE'];
  }
  if (q.part === 'p3' || q.part === 'p4') {
    const prefix = q.part === 'p3' ? 'P3_' : 'P4_';
    if (/graphic|graph|chart|table|map|diagram/.test(stem)) return [prefix + 'GRAPH_LOOKUP'];
    if (/mean when|imply when|why does .*say/.test(stem)) return [prefix + 'IMPLIED_MEANING'];
    if (/do next|will .*do|asked to|encouraged to|suggest/.test(stem)) return [prefix + (q.part === 'p3' ? 'ACTION_NEXT' : 'REQUEST_SUGGEST')];
    if (/purpose|mainly|primarily|about\?/.test(stem)) return [prefix + (q.part === 'p3' ? 'MAIN_TOPIC' : 'PURPOSE_TALK')];
    return [prefix + (q.part === 'p3' ? 'DETAIL_LOOKUP' : 'SPECIFIC_FACT')];
  }
  if (q.part === 'p6') {
    if (q.choices.every(c => c.split(/\s+/).length >= 5)) return ['P6_SENTENCE_INSERTION'];
    if (grammar.includes('connectives')) return ['P6_TRANSITION_WORDS'];
    if (grammar.some(f => f.startsWith('vocab_'))) return ['P6_VOCAB_IN_CONTEXT'];
    return ['P6_GRAMMAR_IN_CONTEXT'];
  }
  if (q.part === 'p7') {
    if (/closest in meaning|most nearly means/.test(stem)) return ['P7A_VOCAB_SYNONYM'];
    if (passages > 1) return [/infer|suggest|impli|most likely/.test(stem) ? 'P7B_MULTI_INFERENCE' : 'P7B_CROSS_INFO_SYNTHESIS'];
    if (/purpose|mainly|primarily/.test(stem)) return ['P7A_MAIN_PURPOSE'];
    return [/infer|suggest|impli|most likely/.test(stem) ? 'P7A_INFERENCE_DETAIL' : 'P7A_FACT_NEGATIVE_FACT'];
  }
  return [];
}

function prepare({ parts = [5] } = {}) {
  const matched = new Map(read('outputs/matched_questions.json').map(q => [q.question_id, q]));
  const normalized = read('outputs/normalized_santa.json');
  const own = new Map(read('outputs/ednet_with_own_tags.json').map(q => [q.question_id, q]));
  const media = mediaIndex();
  const durationsPath = path.resolve(__dirname, '../storage/exam/durations.json');
  const durations = fs.existsSync(durationsPath) ? JSON.parse(fs.readFileSync(durationsPath, 'utf8')) : {};
  const rawCache = new Map();
  const rows = [], rejected = [];
  const seen = new Set();
  for (const normalizedQuestion of normalized.filter(q => parts.includes(Number(q.part.slice(1))))) {
    // Part 5 keeps the original matched-only scope; other Parts include valid Santa-only IDs.
    if (normalizedQuestion.part === 'p5' && !matched.has(normalizedQuestion.question_id)) continue;
    const q = matched.get(normalizedQuestion.question_id) || normalizedQuestion;
    const reject = reason => rejected.push({ id: q.question_id, reason });
    if (seen.has(q.question_id)) throw new Error(`Duplicate question ID ${q.question_id}`);
    seen.add(q.question_id);
    if (!q.answer_valid || q.duplicate_conflict || !/^[abcd]$/.test(q.correct_answer) ||
        q.choices.length !== (q.part === 'p2' ? 3 : 4) || q.choices.some(c => !c.trim())) { reject('invalid answer/options'); continue; }
    const rawPath = path.resolve(root, q.source_raw);
    if (!rawPath.startsWith(root + path.sep)) throw new Error('Source path outside mapping folder');
    if (!rawCache.has(rawPath)) rawCache.set(rawPath, JSON.parse(fs.readFileSync(rawPath, 'utf8')));
    const raw = rawCache.get(rawPath);
    const toeic = raw.oneOfDomainContent?.toeicContent;
    const set = toeic?.oneOfType?.questionSet;
    const source = set?.questions?.find(s => `q${s.id}` === q.question_id);
    const answers = source?.oneOfTypeSpec?.objective?.oneOfAnswers?.andAnswers;
    if (toeic?.part !== q.part || answers?.length !== 1 || 'abcd'[answers[0]] !== q.correct_answer) {
      reject('raw part/answer mismatch'); continue;
    }
    const tree = blockTree(source.description);
    let content = richText(tree).replace(/\s+/g, ' ').trim();
    if (q.part === 'p5' && !content.includes('-------')) { reject('missing explicit raw blank'); continue; }
    const passageTrees = set.passages.map(p => blockTree(p.body));
    const state = { number: 0 };
    const passage = passageTrees.map(t => richText(q.part === 'p6' ? labelBlanks(t, state) : t).trim()).filter(Boolean).join('\n\n');
    if (q.part === 'p6') {
      if (state.number !== set.questions.length) { reject('passage blanks do not match bundle question count'); continue; }
      content = `Chọn đáp án cho chỗ trống [${set.questions.indexOf(source) + 1}].`;
    }
    if (['p6', 'p7'].includes(q.part) && !passage) { reject('missing passage'); continue; }
    const rawChoices = source.oneOfTypeSpec.objective.choices.map(c => richText(blockTree(c)).trim().replace(/\*$/, '').trim());
    if (rawChoices.some((c, i) => c.replace(/\s+/g, ' ') !== q.choices[i].replace(/\s+/g, ' '))) { reject('raw choice mismatch'); continue; }
    const refs = [...new Set([...imageRefs(tree), ...passageTrees.flatMap(imageRefs), ...imageRefs(blockTree(set.description))])];
    const images = refs.map(ref => media.resolve(ref));
    if (images.some(e => !e) || images.length > 1) { reject('missing image or multiple images requiring layout support'); continue; }
    // P3/P4 question audio can be only the spoken prompt; prefer the conversation/talk.
    const passageAudio = set.passages.map(p => p.audioResourceId).filter(Boolean);
    const audioIds = [...new Set(passageAudio.length ? passageAudio : [source.audioResourceId].filter(Boolean))];
    const audio = audioIds.map(id => media.resolve(id));
    if (Number(q.part.slice(1)) <= 4 && (audio.length !== 1 || audio.some(e => !e))) { reject('missing unique local audio'); continue; }
    if (q.part === 'p1' && !images.length) { reject('missing photograph'); continue; }
    if (q.part === 'p1' && !content) content = 'Nghe và chọn câu mô tả đúng bức ảnh.';
    if (!content) { reject('missing question text'); continue; }
    const skillCodes = applicationSkills(q, set.passages.length);
    if (!skillCodes.length) { reject('no explicit application skill adapter'); continue; }
    const mapping = own.get(q.question_id);
    if (q.part === 'p5' && (!mapping?.question_content_matched || mapping.part !== q.part)) { reject('no matched OWN row'); continue; }
    rows.push({ id: q.question_id, part: Number(q.part.slice(1)), content, passage: passage || null,
      stimulus: { ...stimulusFor(q, set, blockTree, media),
        ...(durations[audio[0]?.url] ? { audioDurationSeconds: durations[audio[0].url] } : {}) },
      audioUrl: audio[0]?.url || null, imageUrl: images[0]?.url || null, media: [...audio, ...images],
      choices: q.choices, correctAnswer: q.correct_answer.toUpperCase(),
      skillCodes, explanation: q.explanation, provenance: {
        source: q.source_raw, contentId: q.content_id, bundleId: q.bundle_id,
        ednetTags: q.tags || [], ownContentTags: mapping?.own_content_tag_ids || [],
        mappingStatus: mapping?.status || 'santa_content_only', semanticValidated: mapping?.semantic_validated || false,
        questionContentMatched: matched.has(q.question_id),
        skillAdapter: 'Santa metadata/stem -> application skills; heuristic v2; not independently validated',
      } });
  }
  return { rows, rejected, media };
}

async function apply(prisma, rows) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(573106)::text`;
    const skills = await tx.skill.findMany({ where: { code: { in: [...new Set(rows.flatMap(q => q.skillCodes))] } } });
    const ids = new Map(skills.map(s => [s.code, s.id]));
    for (const row of rows) for (const code of row.skillCodes) {
      if (!ids.has(code)) throw new Error(`Missing skill ${code}; run seed:skills first`);
    }
    let created = 0, skipped = 0;
    const questionIds = [];
    for (const row of rows) {
      const marker = `[santa-ednet:${row.id}]`;
      const existing = await tx.question.findFirst({ where: { explanation: { startsWith: marker } } });
      if (existing) {
        // Backfill only source presentation; keep grading data, memberships and learning history.
        if (row.stimulus && !isDeepStrictEqual(existing.stimulus, row.stimulus)) {
          await tx.question.update({ where: { id: existing.id }, data: { stimulus: row.stimulus } });
        }
        skipped++; questionIds.push(existing.id); continue;
      }
      const q = await tx.question.create({ data: {
        part: row.part || 5, passage: row.passage || null, audioUrl: row.audioUrl || null, imageUrl: row.imageUrl || null,
        ...(row.stimulus ? { stimulus: row.stimulus } : {}),
        content: row.content, optionA: row.choices[0], optionB: row.choices[1],
        optionC: row.choices[2], optionD: row.choices[3] || '', correctAnswer: row.correctAnswer,
        difficulty: 'MEDIUM', itemDifficulty: [0, 10.8, 11.2, 11.9, 12.3, 11.5, 12.1, 12.8][row.part || 5],
        explanation: `${marker}\n${row.explanation}\n\nNguồn/mapping: ${JSON.stringify(row.provenance)}\nĐộ khó khởi tạo, chưa hiệu chỉnh.`,
        skills: { create: row.skillCodes.map(code => ({ skillId: ids.get(code) })) },
      } });
      questionIds.push(q.id); created++;
    }
    const verified = await tx.question.count({ where: { id: { in: questionIds }, skills: { some: {} } } });
    if (verified !== rows.length) throw new Error('Post-import count verification failed');
    return { created, skipped, verified, questionIds };
  }, { timeout: 300000 });
}

async function main() {
  const partsArg = process.argv.find(a => a.startsWith('--parts='));
  const parts = partsArg ? partsArg.slice(8).split(',').map(Number) : [1, 2, 3, 4, 5, 6, 7];
  if (parts.some(p => !Number.isInteger(p) || p < 1 || p > 7)) throw new Error('Invalid --parts list');
  const { rows, rejected, media } = prepare({ parts });
  const byPart = rows.reduce((acc, q) => { acc[q.part] = (acc[q.part] || 0) + 1; return acc; }, {});
  const rejectionReasons = rejected.reduce((acc, q) => { acc[q.reason] = (acc[q.reason] || 0) + 1; return acc; }, {});
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
    selected: rows.length, byPart, rejected: rejected.length, rejectionReasons }, null, 2));
  if (!process.argv.includes('--apply')) return;
  // An explicitly provided DATABASE_URL takes precedence over the local environment.
  if (!process.env.DATABASE_URL) process.loadEnvFile(path.resolve(__dirname, '../.env'));
  const prisma = new PrismaClient();
  try {
    console.log(JSON.stringify({ media: media.copy(rows.flatMap(r => r.media)) }));
    const { questionIds, ...summary } = await apply(prisma, rows);
    console.log(JSON.stringify({ ...summary, firstQuestionId: questionIds[0], lastQuestionId: questionIds.at(-1) }, null, 2));
  }
  finally { await prisma.$disconnect(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { richText, prepare, apply, blockTree, labelBlanks, applicationSkills };
