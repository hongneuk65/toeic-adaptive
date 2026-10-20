const {test} = require('node:test');
const assert = require('node:assert/strict');
const {repairReadingOrder} = require('./repair-santa-reading-order.cjs');
function fixture(edited = false) {
 const book = {key:'santa-reading:one',title:'Original',text:'Original text',questions:[{sourceQuestionId:'q2',prompt:'First'},{sourceQuestionId:'q1',prompt:'Second'}]};
 const old = {id:8,revision:1,title:book.title,text:book.text,topic:'Santa TOEIC Part 7',kind:'ARTICLE',difficulty:'MEDIUM',origin:'CRAWL',reviewed:false,questions:[...book.questions].reverse()};
 if (edited) old.questions[0] = {...old.questions[0],prompt:'Administrator correction'};
 const article = {id:3,key:book.key,ownerId:null,currentVersionId:8,publishedVersionId:8,versions:[old]};
 const attempts = [{id:101,versionId:8}];
 const tx = {readingArticle:{findUnique:async()=>article,updateMany:async({where,data})=>{const match=Object.entries(where).every(([key,value])=>article[key]===value);if(match)Object.assign(article,data);return {count:match?1:0};}},readingVersion:{aggregate:async()=>({_max:{revision:Math.max(...article.versions.map(v=>v.revision))}}),create:async({data})=>{const version={id:8+article.versions.length,...data};article.versions.push(version);return version;}},$executeRaw:async()=>{}};
 return {book,old,article,attempts,tx};
}
test('dry run detects source-order repair without writes',async()=>{const f=fixture();const result=await repairReadingOrder(f.tx,[f.book]);assert.equal(result.candidates,1);assert.equal(result.created,0);assert.equal(f.article.versions.length,1);assert.equal(f.article.currentVersionId,8);});
test('repair clones versions, conditionally changes both pointers and leaves historical attempts untouched',async()=>{const f=fixture();const result=await repairReadingOrder(f.tx,[f.book],true);assert.equal(result.created,1);assert.equal(result.updatedPointers,2);assert.equal(f.article.currentVersionId,9);assert.equal(f.article.publishedVersionId,9);assert.equal(f.attempts[0].versionId,8);assert.deepEqual(f.old.questions,[...f.book.questions].reverse());assert.deepEqual(f.article.versions[1].questions,f.book.questions);const again=await repairReadingOrder(f.tx,[f.book],true);assert.equal(again.created,0);assert.equal(again.candidates,0);assert.equal(f.article.versions.length,2);});
test('admin modifications are never overwritten',async()=>{const f=fixture(true);const result=await repairReadingOrder(f.tx,[f.book],true);assert.equal(result.skippedEdited,1);assert.equal(result.created,0);assert.equal(f.article.currentVersionId,8);});

test('import preparation orders all source groups by original question position',()=>{
 const {prepare}=require('./import-mapped-questions.cjs');
 const {prepareLibraries}=require('./import-learning-content.cjs');
 const position=new Map(prepare({parts:[7]}).rows.map(q=>[q.id,q.stimulus?.questionPosition]));
 const books=prepareLibraries().reading;
 assert.equal(books.length,171);
 for(const book of books){const positions=book.questions.map(q=>position.get(q.sourceQuestionId));assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));assert.ok(book.questions.every(q=>!('sourceQuestionPosition' in q)));}
});
