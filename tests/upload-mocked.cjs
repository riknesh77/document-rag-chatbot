// Execute the actual Pages API handler with a mocked local model. No API credits.
const http = require('node:http');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const path = require('node:path');
const { spawn } = require('node:child_process');
const embedder = require('../lib/embedder');
const persistence = require('../lib/db');
const { createMockDb } = require('./mock-db.cjs');
const db = createMockDb();
const extractor = async texts => ({tolist:()=>texts.map(()=>Array(384).fill(1))});
extractor.tokenizer={encode:text=>text.split(' '),decode:ids=>ids.join(' ')};
const filename = path.resolve('pages/api/upload.js');
const localRequire = createRequire(filename);
const source = fs.readFileSync(filename,'utf8')
  .replace(/import \{([^}]+)\} from "([^"]+)";/g, 'const {$1} = require("$2");')
  .replace(/import formidable from "formidable";/, 'const formidable = require("formidable").default;')
  .replace('export const config', 'const config')
  .replace('export default async function handler', 'async function handler');
const handler = vm.runInNewContext(source + '\nhandler;', {Buffer, Uint8Array, require: name => name === '../../lib/auth' ? {requireUser:async()=>({id:'test-user'}),checkOrigin:()=>{},rateLimit:async()=>{},apiError:()=>{throw new Error('unexpected auth failure')}} : name === '../../lib/embedder' ? {...embedder,embedChunks: chunks => embedder.embedChunks(chunks,{extractor})} : name === '../../lib/db' ? {...persistence,getDb:()=>({document:{count:async()=>0}}),saveDocument: input => persistence.saveDocument(input,{db})} : localRequire(name)});
const server = http.createServer((req,res)=>{
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => {res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
  if (req.url === '/') {res.end('Upload a PDF');return;}
  Promise.resolve(handler(req,res)).catch(()=>{res.statusCode=500;res.end('{}');});
});
server.listen(0,'127.0.0.1',()=>{
  const child = spawn(process.execPath,['tests/upload.cjs'], {stdio:'inherit',env:{...process.env,TEST_BASE_URL:`http://127.0.0.1:${server.address().port}`}});
  child.on('exit',code=>{server.close();process.exitCode=code || 0;});
});
