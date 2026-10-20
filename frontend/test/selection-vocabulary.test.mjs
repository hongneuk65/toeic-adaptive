import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';
const source=await readFile(new URL('../src/lib/selection-vocabulary.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}});
const {vocabularyRouteAllowed,selectedVocabularyText,vocabularyAnchor}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('selection vocabulary is available during study and submitted review, never timed exams',()=>{
  for(const path of ['/reading','/listening','/theory/7/quiz','/flashcards/15','/exam/863/review'])assert.equal(vocabularyRouteAllowed(path),true);
  for(const path of ['/exam','/exam/863','/admin','/login'])assert.equal(vocabularyRouteAllowed(path),false);
});
test('short selections normalize punctuation while long text and empty selections are rejected',()=>{
  assert.equal(selectedVocabularyText(' “renewed  contract,” '),'renewed contract');
  assert.equal(selectedVocabularyText('1234'),null);
  assert.equal(selectedVocabularyText('word '.repeat(13)),null);
  assert.deepEqual(vocabularyAnchor({left:500,bottom:900},390,600),{left:222,top:548});
});
