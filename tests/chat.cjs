const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
function handlerFor({exists=true,fail=false}={}) {
 const source=fs.readFileSync('pages/api/chat.js','utf8').replace(/import \{([^}]+)\} from '([^']+)';/g,'const {$1}=require("$2");').replace('export const config','const config').replace('export default async function handler','async function handler');
 return vm.runInNewContext(source+'\nhandler;',{assert,require:name=>name.endsWith('/rag')?{answerQuestion:async(...args)=>{assert.equal(args.length,2);if(fail)throw new Error('database-password');return {answer:'answer',sources:[]};}}:{getDb:()=>({document:{findUnique:async()=>exists?{id:1}:null}})}});
}
async function request(handler,method,body){const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.body=data;return this;}};await handler({method,body},res);return res;}
test('chat route rejects methods and malformed questions',async()=>{assert.equal((await request(handlerFor(),'GET')).code,405);for(const body of [{},{documentId:'1',question:'test'},{documentId:1,question:' '},{documentId:1,question:'x'.repeat(1001)}])assert.equal((await request(handlerFor(),'POST',body)).code,400);});
test('chat route reports missing documents and sanitizes failures',async()=>{assert.equal((await request(handlerFor({exists:false}),'POST',{documentId:1,question:'test'})).code,404);const res=await request(handlerFor({fail:true}),'POST',{documentId:1,question:'test'});assert.equal(res.code,503);assert.ok(!JSON.stringify(res.body).includes('password'));});

test('request debug fields cannot enable internal traces',async()=>{const res=await request(handlerFor(),'POST',{documentId:1,question:'test',debug:true,onTrace:'dump secrets'});assert.equal(res.code,200);assert.deepEqual(Object.keys(res.body),['answer','sources']);});
