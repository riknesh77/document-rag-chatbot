const assert=require('node:assert/strict');const {PrismaClient,Prisma}=require('@prisma/client');const {chunkText}=require('../lib/chunker');const {search}=require('../lib/vectorSearch');const {NOT_FOUND}=require('../lib/rag');
const db=new PrismaClient();const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
function pdf(text){
 const lines=text.match(/.{1,70}/g)||[''];const height=Math.max(792,lines.length*16+144);const stream=`BT /F1 10 Tf 16 TL 72 ${height-72} Td `+lines.map(line=>`(${line.replace(/[\\()]/g,'\\$&')}) Tj T*`).join('\n')+' ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let data='%PDF-1.4\n';const offsets=[];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(data));data+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xref=Buffer.byteLength(data);data+='xref\n0 6\n0000000000 65535 f \n'+offsets.map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return Buffer.from(data);
}
async function chat(documentId,question){const r=await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({documentId,question})});const data=await r.json();assert.equal(r.status,200,'Chat request failed');return data;}
async function ranking(){
 const sentinel=new Error('rollback-fixtures');
 try {await db.$transaction(async tx=>{
  const one=await tx.document.create({data:{title:'isolation-test-A',filename:'test',content:'test',pageCount:1,sizeBytes:0}});
  const two=await tx.document.create({data:{title:'isolation-test-B',filename:'test',content:'test',pageCount:1,sizeBytes:0}});
  for(let i=0;i<7;i++) {const v=Array(384).fill(0);v[0]=1-i/10;v[1]=Math.sqrt(1-v[0]*v[0]);await tx.$executeRaw`INSERT INTO "Chunk" ("documentId","index","text","tokenCount","startToken","endToken","embeddingModel","embedding") VALUES (${one.id},${i},'known',1,0,1,'Xenova/all-MiniLM-L6-v2',${JSON.stringify(v)}::vector(384))`;}
  const v=Array(384).fill(0);v[0]=1;
  await tx.$executeRaw`INSERT INTO "Chunk" ("documentId","index","text","tokenCount","startToken","endToken","embeddingModel","embedding") VALUES (${two.id},0,'other document',2,0,2,'Xenova/all-MiniLM-L6-v2',${JSON.stringify(v)}::vector(384))`;
  const results=await search(one.id,v,{db:tx});assert.equal(results.length,5);assert.deepEqual(results.map(r=>r.index),[0,1,2,3,4]);assert.ok(results.every(r=>r.documentId===one.id));assert.ok(results.every((r,i)=>!i||results[i-1].similarity>=r.similarity));
  throw sentinel;
 },{timeout:60000});}catch(e){if(e!==sentinel)throw e;}
 console.log('PASS real cosine ranking, top-five limit, and cross-document isolation; fixtures rolled back');
}
(async()=>{try{
 const columns=await db.$queryRaw`SELECT format_type(a.atttypid,a.atttypmod) AS type FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='Chunk' AND a.attname='embedding' AND NOT a.attisdropped`;
 assert.equal(columns[0]?.type,'vector(384)');
 const filename='local-rag-verification-'+require('node:crypto').randomUUID()+'.pdf';
 const facts='The Aurora research station opens on 14 March 2027. The director is Dr Maya Chen. The station is located in Tromso, Norway. ';
 const text=facts+('The station records daily weather observations for the research archive. '.repeat(65))+facts;
 const form=new FormData();form.append('file',new Blob([pdf(text)],{type:'application/pdf'}),filename);
 const response=await fetch(base+'/api/upload',{method:'POST',body:form});const body=await response.json();assert.equal(response.status,200,'Upload failed: '+(body.error||'unknown'));
 const expected=chunkText(body.text);assert.ok(expected.length>1);
 const documents=await db.document.findMany({where:{filename},select:{id:true}});assert.equal(documents.length,1);assert.equal(documents[0].id,body.documentId);
 const rows=await db.$queryRaw`SELECT "documentId","index","text","startToken","endToken",vector_dims(embedding) AS dimensions,vector_norm(embedding) AS norm FROM "Chunk" WHERE "documentId"=${body.documentId} ORDER BY "index"`;
 assert.equal(rows.length,expected.length);rows.forEach((r,i)=>{assert.equal(r.documentId,body.documentId);assert.equal(r.index,i);assert.equal(r.text,expected[i].text);assert.equal(r.dimensions,384);assert.ok(Math.abs(r.norm-1)<0.001);if(i)assert.equal(rows[i-1].endToken-r.startToken,50);});
 const answer=await chat(body.documentId,'When does the Aurora research station open?');assert.match(answer.answer,/14 March 2027/);assert.ok(answer.sources.length);assert.ok(answer.sources.every(s=>s.documentId===body.documentId&&s.preview.includes('14 March 2027')));
 const absent=await chat(body.documentId,'What is the annual budget of the Aurora research station?');assert.equal(absent.answer,NOT_FOUND);assert.deepEqual(absent.sources,[]);
 await ranking();
 console.log(JSON.stringify({passed:true,documentId:body.documentId,chunks:rows.length,dimensions:384,answer:answer.answer,sources:answer.sources.map(s=>({documentId:s.documentId,chunkIndex:s.chunkIndex,similarity:s.similarity})),missingAnswer:absent.answer}));
}catch(e){console.error(JSON.stringify({passed:false,type:e.name,code:e.code||e.errorCode||'ASSERTION_OR_RUNTIME_FAILURE'}));process.exitCode=1;}finally{await db.$disconnect();}})();
