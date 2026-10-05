const fs = require('node:fs');
const path = require('node:path');
const {parseEnv} = require('node:util');

async function run() {
  if (process.env.NODE_ENV === 'production') throw new Error('DEVELOPMENT_ONLY');
  if (fs.existsSync('.env.local')) Object.assign(process.env, parseEnv(fs.readFileSync('.env.local', 'utf8')));
  if (process.env.NODE_ENV === 'production') throw new Error('DEVELOPMENT_ONLY');
  const [idArg, ...questionWords] = process.argv.slice(2);
  const evaluation = idArg === '--evaluate';
  const suite = evaluation ? JSON.parse(fs.readFileSync(questionWords[0] || 'tests/fixtures/sip-evaluation.json', 'utf8')) : null;
  const documentId = evaluation ? suite.documentId : Number(idArg);
  if (!Number.isSafeInteger(documentId) || documentId < 1 || (!evaluation && !questionWords.length)) {
    throw new Error('USAGE: npm run debug:rag -- DOCUMENT_ID "question" or npm run test:document');
  }
  const {getDb} = require('../lib/db');
  const {answerQuestion, NOT_FOUND} = require('../lib/rag');
  const {chunkText} = require('../lib/chunker');
  const db = getDb();
  try {
    const document = await db.document.findUnique({where: {id: documentId}});
    if (!document) throw new Error('DOCUMENT_NOT_FOUND');
    if (suite && document.title !== suite.documentTitle) throw new Error('EVALUATION_DOCUMENT_MISMATCH');
    const chunks = await db.$queryRaw`SELECT "id", "index", "text", "tokenCount", "startToken", "endToken", "embeddingModel", vector_dims(embedding) AS dimensions, vector_norm(embedding) AS norm FROM "Chunk" WHERE "documentId"=${documentId} ORDER BY "index"`;
    const recomputed = chunkText(document.content);
    const integrity = chunks.map((c,i) => ({index:c.index, dimensions:c.dimensions, norm:c.norm, model:c.embeddingModel, chunkMatches: c.text===recomputed[i]?.text && c.startToken===recomputed[i]?.startToken && c.endToken===recomputed[i]?.endToken}));
    const reports = [];
    const directory=path.join('.cache','diagnostics'); fs.mkdirSync(directory,{recursive:true});
    const filename=path.join(directory,`document-${documentId}-${Date.now()}.json`);
    const save=()=>fs.writeFileSync(filename,JSON.stringify({document:{id:document.id,title:document.title,text:document.content},chunks,integrity,reports},null,2));
    for (const test of suite?.cases || [{question:questionWords.join(' ')}]) {
      let trace; const start=Date.now();
      const result = await answerQuestion(documentId,test.question,{onTrace: value => {trace=value;}});
      const ranks = trace.retrieved.map((c,i)=>({rank:i+1,index:c.index,similarity:c.similarity}));
      const retrievalPass = !suite || test.answerChunks.every(index=>ranks.some(c=>c.index===index));
      const grounded = result.sources.length>0 && result.sources.every(s=>trace.retrieved.some(c=>c.id===s.chunkId && c.documentId===s.documentId));
      const pass = !suite ? undefined : retrievalPass && (test.kind==='unanswerable' ? result.answer===NOT_FOUND && result.sources.length===0 : grounded && test.patterns.every(p=>new RegExp(p,'i').test(result.answer)));
      const report = {...test,trace,result,ranks,retrievalPass,pass,milliseconds:Date.now()-start,residentMemoryMiB:Math.round(process.memoryUsage().rss/1048576)};
      reports.push(report); save();
      console.log(JSON.stringify({question:test.question,expected:test.expected,ranks,answer:result.answer,citations:result.sources.map(s=>s.chunkIndex),pass,milliseconds:report.milliseconds}));
    }
    console.log(JSON.stringify({report:filename,passed:reports.filter(r=>r.pass).length,total:reports.length,integrity}));
    if (suite && (reports.some(r=>!r.pass) || integrity.some(c=>!c.chunkMatches || c.dimensions!==384 || Math.abs(c.norm-1)>0.001))) process.exitCode=1;
  } finally {await db.$disconnect();}
}
run().catch(error=>{
  // Never log driver/model exception messages, which may contain connection details.
  const safe=['DEVELOPMENT_ONLY','DOCUMENT_NOT_FOUND','EVALUATION_DOCUMENT_MISMATCH'];
  console.error(JSON.stringify({error:safe.includes(error.message)?error.message:'DIAGNOSTIC_FAILED',code:/^[A-Z]\d{4}$/.test(error.code||'')?error.code:undefined}));
  process.exitCode=1;
});
