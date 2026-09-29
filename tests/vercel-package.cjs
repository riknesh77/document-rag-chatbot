// Smoke test the traced artifact outside the repository, where missing native
// dependencies cannot silently resolve from the development node_modules.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const vm=require('node:vm'),{spawnSync}=require('node:child_process');
const {traceFiles,check}=require('../scripts/check-vercel-package.cjs');
check();
const root=process.cwd();
const target=fs.mkdtempSync(path.join(os.tmpdir(),'docurag-trace-'));
try {
  for(const file of new Set([...traceFiles('upload'),...traceFiles('chat')])) {
    const relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Trace escaped project root');
    const dest=path.join(target,relative);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    if(fs.lstatSync(file).isSymbolicLink()) {
      const linked=path.relative(root,fs.realpathSync(file));
      if(linked.startsWith('..')||path.isAbsolute(linked))throw new Error('Linked dependency escaped project root');
      fs.symlinkSync(path.join(target,linked),dest,process.platform==='win32'?'junction':'dir');
    } else fs.copyFileSync(file,dest);
  }
  const fixtureSource=fs.readFileSync('tests/upload.cjs','utf8').split('const base =')[0];
  const makePdf=vm.runInNewContext(fixtureSource+'\nmakePdf;',{require,Buffer});
  fs.writeFileSync(path.join(target,'fixture.pdf'),makePdf('Aurora opens on 14 March 2027.'));
  const script=`
    const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
    (async()=>{
      const {default:handler}=await require('./.next/server/pages/api/upload.js');
      const server=http.createServer((req,res)=>{
        res.status=code=>{res.statusCode=code;return res;};
        res.json=body=>res.end(JSON.stringify(body));
        handler(req,res).catch(()=>{res.statusCode=500;res.end('{}');});
      });
      await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
      try {
        const form=new FormData();form.append('file',new Blob([fs.readFileSync('fixture.pdf')],{type:'application/pdf'}),'fixture.pdf');
        const r=await fetch('http://127.0.0.1:'+server.address().port,{method:'POST',body:form});
        const body=await r.json();
        assert.equal(r.status,503,JSON.stringify(body));
        assert.match(body.error,/Configure DATABASE_URL/);
        console.log('PASS traced artifact: real PDF extraction, chunking and offline native MiniLM reached persistence; no credentials or development dependencies available.');
      } finally {server.close();}
    })().catch(e=>{console.error(e);process.exitCode=1;});
  `;
  const env={...process.env,VERCEL:'1',GENERATION_PROVIDER:'groq',NODE_ENV:'production'};
  delete env.DATABASE_URL;delete env.GROQ_API_KEY;delete env.OPENAI_API_KEY;delete env.NODE_PATH;
  const result=spawnSync(process.execPath,['-e',script],{cwd:target,env,stdio:'inherit',timeout:120000});
  if(result.status!==0) process.exitCode=1;
} finally {
  // Only the unique temporary directory created by this test can be removed.
  if(path.dirname(target)!==path.resolve(os.tmpdir())||!path.basename(target).startsWith('docurag-trace-'))throw new Error('Unsafe cleanup path');
  fs.rmSync(target,{recursive:true,force:true});
}
