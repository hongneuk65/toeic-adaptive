import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import ts from 'typescript';
const source=await readFile(new URL('../src/lib/review-explanation.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}});
const {formatReviewExplanation}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('review hides source metadata and separates pedagogical headings',()=>{
 const text=formatReviewExplanation('[santa-ednet:q11619] Diễn giải 1. Chọn tính từ. 2. Bổ nghĩa designs. Phân tích đáp án sai (A) complex. Nguồn/mapping: {"source":"data/raw"}');
 assert.ok(!text.includes('santa-ednet'));assert.ok(!text.includes('data/raw'));
 assert.match(text,/### Diễn giải\n\n1\./);assert.match(text,/\n\n2\./);assert.match(text,/### Phân tích đáp án sai/);
});
