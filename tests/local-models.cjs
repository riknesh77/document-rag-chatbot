const {test}=require('node:test');const assert=require('node:assert/strict');const {embedTexts}=require('../lib/embedder');const {answerQuestion,NOT_FOUND}=require('../lib/rag');
test('real local models produce normalized vectors, cited known answer and missing-answer refusal',async()=>{
 const {countTokens}=require('../lib/generator');const tokenCount=await countTokens('Question: test');assert.ok(Number.isInteger(tokenCount)&&tokenCount>0);
 const text='The Aurora research station opens on 14 March 2027. The director is Dr Maya Chen. The station is located in Tromso, Norway.';
 const [vector]=await embedTexts([text]);assert.equal(vector.length,384);assert.ok(Math.abs(Math.hypot(...vector)-1)<1e-6);
 // This test isolates real inference; the database is exercised by test:e2e.
 const retrieve=async(id,q)=>[{id:1,documentId:id,index:0,documentTitle:'Aurora',text,similarity:vector.reduce((sum,v,i)=>sum+v*q[i],0)}];
 const result=await answerQuestion(1,'When does the Aurora research station open?',{retrieve});assert.match(result.answer,/14 March 2027/);assert.equal(result.sources[0].documentId,1);assert.match(result.sources[0].preview,/14 March 2027/);
 const missing=await answerQuestion(1,'What is the annual budget of the Aurora research station?',{retrieve});assert.equal(missing.answer,NOT_FOUND);assert.deepEqual(missing.sources,[]);
});
