const {test} = require('node:test');
const assert = require('node:assert/strict');
const {saveDocument} = require('../lib/db');
const {createMockDb} = require('./mock-db.cjs');
const chunk = {index:0,text:"quote '); DROP TABLE test; --",tokenCount:10,startToken:0,endToken:10,embeddingModel:'Xenova/all-MiniLM-L6-v2',embedding:Array(384).fill(0.5)};
const input = {filename:'test.pdf',text:chunk.text,pageCount:1,sizeBytes:123,chunks:[chunk]};
test('transaction stores document and bound vector with all chunk fields',async()=>{
 const db = createMockDb();
 assert.deepEqual(await saveDocument(input,{db}),{documentId:1,filename:'test.pdf',chunkCount:1});
 assert.equal(db.state.documents[0].content,input.text);
 const sql = db.state.statements[0];
 assert.match(sql.sql,/::vector\(384\)/);
 assert.ok(!sql.sql.includes(chunk.text));
 assert.deepEqual(sql.values,[1,0,chunk.text,10,0,10,chunk.embeddingModel,JSON.stringify(chunk.embedding)]);
 assert.equal(db.state.committed,1);
});
test('chunk insert failure rolls back parent and gives sanitized error',async()=>{
 const db = createMockDb({failInsert:true});
 await assert.rejects(saveDocument(input,{db}),err=>err.status===503&&!err.message.includes('password'));
 assert.equal(db.state.documents.length,0);
 assert.equal(db.state.rolledBack,1);
});
test('batching preserves order and uses one transaction',async()=>{
 const db=createMockDb();
 const chunks=Array.from({length:130},(_,index)=>({...chunk,index}));
 const result=await saveDocument({...input,chunks},{db});
 assert.equal(result.chunkCount,130);
 assert.equal(db.state.statements.length,3);
 assert.equal(db.state.committed,1);
 assert.equal(db.state.statements[1].values[1],64);
});
test('invalid dimensions and nonfinite values are rejected before transaction',async()=>{
 for(const embedding of [[1],Array(384).fill(NaN),Array(384).fill(1e100)]) {
  const db=createMockDb();
  await assert.rejects(saveDocument({...input,chunks:[{...chunk,embedding}]},{db}));
  assert.equal(db.state.committed,0);assert.equal(db.state.rolledBack,0);
 }
});
test('blank PDF can persist a document with zero chunks',async()=>{
 const db=createMockDb();
 assert.equal((await saveDocument({...input,text:'',chunks:[]},{db})).chunkCount,0);
 assert.equal(db.state.statements.length,0);
});
test('missing DATABASE_URL gives configuration error',async()=>{
 const old=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
 try {await assert.rejects(saveDocument(input),err=>err.status===503&&err.message.includes('DATABASE_URL'));}
 finally {if(old!==undefined) process.env.DATABASE_URL=old;}
});
