const {test,beforeEach,afterEach} = require('node:test');
const assert = require('node:assert/strict');
const {generateAnswer,countTokens,modelName} = require('../lib/generator');
const {getPipeline} = require('../lib/localModels');
const {answerQuestion,NOT_FOUND} = require('../lib/rag');
let saved;
beforeEach(() => {
  saved = {...process.env};
  process.env.VERCEL = '1';
  process.env.GENERATION_PROVIDER = 'groq';
  process.env.GROQ_API_KEY = 'test-only-not-a-real-key';
  process.env.GENERATION_MODEL = 'openai/gpt-oss-20b';
});
afterEach(() => {process.env = saved;});
const completion = content => ({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content,reasoning:'private internal reasoning'}}]})});
test('hosted generation uses server credentials, bounded deterministic requests and content only', async () => {
  const text = await generateAnswer('Context: Aurora opens in March.', {fetchImpl:async(url,options)=>{
    assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(options.headers.Authorization,'Bearer test-only-not-a-real-key');
    assert.equal(options.redirect,'error');
    assert.ok(options.signal instanceof AbortSignal);
    const body=JSON.parse(options.body);
    assert.equal(body.model,modelName());
    assert.equal(body.temperature,0);
    assert.equal(body.reasoning_effort,'low');
    assert.equal(body.max_completion_tokens,1024);
    assert.equal(body.messages[0].content,'Context: Aurora opens in March.');
    return completion(' March. ');
  }});
  assert.equal(text,'March.');
});
test('Vercel cannot load Qwen; hosted token budgeting needs no generation model', async () => {
  assert.ok(await countTokens('ordinary text <|endoftext|>') > 0);
  await assert.rejects(getPipeline('generation'),/disabled on Vercel/);
  process.env.GENERATION_PROVIDER='local';
  await assert.rejects(generateAnswer('test'),/hosted/);
  delete process.env.VERCEL;
  assert.match(modelName(),/Qwen2.5-1.5B/);
});
test('missing credentials, expired deadline and oversized prompts fail before any request', async () => {
  const fetchImpl=()=>assert.fail('No request expected');
  delete process.env.GROQ_API_KEY;
  await assert.rejects(generateAnswer('test',{fetchImpl}),/not configured/);
  process.env.GROQ_API_KEY='test-only';
  await assert.rejects(generateAnswer('test',{fetchImpl,deadline:Date.now()-1}),/timed out/);
  await assert.rejects(generateAnswer('😀'.repeat(8000),{fetchImpl}),/context budget/);
});
test('provider errors, malformed/empty/truncated completions and network failures are sanitized', async () => {
  const bad=[async()=>({ok:false,json:()=>assert.fail('Do not read provider error bodies')}),
    async()=>{throw new Error('test-only-secret database-password');},
    async()=>({ok:true,json:async()=>({})}),async()=>completion(''),
    async()=>({ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:'partial'}}]})})];
  for(const fetchImpl of bad) await assert.rejects(generateAnswer('test',{fetchImpl}),error=>{
    assert.equal(error.message,'Hosted generation unavailable. Check provider configuration and quota, then retry.');return true;
  });
});
test('hosted draft still passes through evidence validation and returns original sources', async t => {
  const source={id:11,documentId:7,documentTitle:'Aurora.pdf',index:0,startToken:0,endToken:10,text:'Aurora opens on 14 March 2027.',similarity:0.8};
  const dependencies={embed:async()=>[Array(384).fill(0)],retrieve:async()=>[source],rank:async(q,c)=>c.filter(x=>!x.heading)};
  const prompts=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    const prompt=JSON.parse(options.body).messages[0].content;prompts.push(prompt);
    return completion(prompt.includes('Premise:')?'YES':'14 March 2027.');
  });
  const result=await answerQuestion(7,'When does Aurora open?',dependencies);
  assert.equal(result.answer,source.text);
  assert.equal(result.sources[0].chunkId,11);
  assert.equal(result.model,'openai/gpt-oss-20b');
  assert.equal(prompts.length,2);
  assert.match(prompts[0],/based ONLY on the context/);
  assert.match(prompts[1],/supported by the premise/);
});
test('hosted hallucination or abstention never acquires citations', async t => {
  const dependencies={embed:async()=>[Array(384).fill(0)],retrieve:async()=>[{id:11,documentId:7,index:0,startToken:0,endToken:10,text:'Aurora opens on 14 March 2027.'}],rank:async(q,c)=>c.filter(x=>!x.heading)};
  t.mock.method(globalThis,'fetch',async(url,options)=>completion(JSON.parse(options.body).messages[0].content.includes('Premise:')?'NO':'The budget is one million dollars.'));
  const result=await answerQuestion(7,'What is the budget?',dependencies);
  assert.equal(result.answer,NOT_FOUND);
  assert.deepEqual(result.sources,[]);
  t.mock.method(globalThis,'fetch',async()=>completion('NOT_FOUND'));
  assert.equal((await answerQuestion(7,'What is the budget?',dependencies)).answer,NOT_FOUND);
});
