// Opt-in provider smoke with synthetic, nonpersonal English source only.
require('../dist/config/environment');
const assert = require('node:assert/strict');
const { ReadingAiService } = require('../dist/reading/reading-ai.service');
const { RagLlmService } = require('../dist/rag/rag-llm.service');
const { publicQuestions } = require('../dist/reading/reading-core');

async function main() {
  assert.equal(process.env.READING_GENERATION_LIVE, '1', 'Set READING_GENERATION_LIVE=1 to allow provider calls.');
  const text = 'Westbridge Company will hold a customer service workshop on Tuesday, October 27, in the main meeting room. The workshop begins at nine in the morning and ends at eleven. New employees are invited to attend. Participants should register with their team supervisor before Friday. The company will provide workbooks at the entrance. Employees who cannot attend may request a copy of the materials from their supervisor after the workshop.';
  const questions = await new ReadingAiService(new RagLlmService()).questions(text);
  assert.ok(questions.length > 0);
  const visible = publicQuestions(questions);
  assert.ok(visible.every(q => !('answer' in q) && !('learning' in q) && !('evidence' in q)));
  console.log(JSON.stringify({ status: 'passed', questions: questions.length, levels: [...new Set(visible.map(q => q.learningLevel))], sourceUnchanged: true }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
