const {test}=require('node:test');const assert=require('node:assert/strict');const {search}=require('../lib/vectorSearch');
const vector=Array(384).fill(0);vector[0]=1;
test('retrieval uses bound document filter, cosine ranking and limit five',async()=>{
 let query;
 const rows=[{documentId:3,index:1,similarity:0.9},{documentId:3,index:0,similarity:0.8}];
 const result=await search(3,vector,{db:{$queryRaw:async q=>{query=q;return rows;}}});
 assert.deepEqual(result,rows);assert.match(query.sql,/WHERE c\."documentId" = \?/);assert.match(query.sql,/ORDER BY c\."embedding" <=>/);assert.match(query.sql,/LIMIT 5/);assert.ok(query.values.includes(3));assert.equal(query.values.filter(v=>v===JSON.stringify(vector)).length,2);
});
test('invalid ID and query vector are rejected before database calls',async()=>{for(const id of ['1 OR 1=1',0,-1])await assert.rejects(search(id,vector));await assert.rejects(search(1,[1]));});
