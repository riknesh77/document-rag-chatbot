const {test}=require('node:test');const assert=require('node:assert/strict');
const {answerQuestion,NOT_FOUND}=require('../lib/rag');
const {selectContext,MAX_INPUT_TOKENS}=require('../lib/context');
const {evidenceCatalog}=require('../lib/evidence');
const vector=Array(384).fill(0);vector[0]=1;
const row={id:7,documentId:1,documentTitle:'Aurora',index:0,text:'The station opens on 14 March 2027.',similarity:0.9};
const deps={embed:async texts=>texts.map(()=>vector),retrieve:async()=>[row],tokenLength:async()=>100,rank:async(_,catalog)=>catalog.filter(c=>!c.heading),verify:async()=> 'YES'};
test('question and complete evidence reach the model; selected text and citations come from the document',async()=>{
 const result=await answerQuestion(1,'When does the station open?',{...deps,generate:async prompt=>{assert.match(prompt,/ONLY/);assert.match(prompt,/\[Source 1\]/);assert.match(prompt,/14 March 2027/);assert.match(prompt,/When does/);return '14 March 2027';}});
 assert.equal(result.answer,row.text);assert.equal(result.sources[0].documentId,1);assert.equal(result.sources[0].chunkIndex,0);assert.equal(result.sources[0].similarity,0.9);
});
test('paraphrased questions need no verbatim question/answer match',async()=>{
 const result=await answerQuestion(1,'When can visitors first enter?',{...deps,generate:async()=> 'Visitors can enter in March 2027.'});assert.equal(result.answer,row.text);
});
test('unsupported model claims cannot become answers or citations',async()=>{
 for(const raw of ['The budget is $20,000.','Unrelated generated claims']) {
  const result=await answerQuestion(1,'Budget?',{...deps,generate:async()=>raw,verify:async()=> 'NO'});assert.equal(result.answer,NOT_FOUND);assert.deepEqual(result.sources,[]);
 }
});
test('empty selection and no retrieved chunks produce not-found',async()=>{
 assert.equal((await answerQuestion(1,'Budget?',{...deps,generate:async()=> 'NOT_FOUND'})).answer,NOT_FOUND);
 assert.equal((await answerQuestion(1,'why?',{...deps,retrieve:async()=>[]})).answer,NOT_FOUND);
});
test('cross-document retrieval is rejected, never cited',async()=>{await assert.rejects(answerQuestion(2,'when?',deps),/isolation/);});
test('low cosine similarity alone never refuses a supported answer',async()=>{
 const result=await answerQuestion(1,'When?',{...deps,retrieve:async()=>[{...row,similarity:0.1}],generate:async()=> '14 March 2027'});assert.equal(result.answer,row.text);
});
test('wrapped sentences and overlapping chunk boundaries preserve the complete fact and provenance',()=>{
 const a={...row,text:'Introduction\nThe project needs historical\nmachine data and maintenance',startToken:0,endToken:500};
 const b={...row,id:8,index:1,text:'machine data and maintenance records. Approval is also required.',startToken:450,endToken:510};
 const catalog=evidenceCatalog([b,a]);
 const sentence=catalog.find(c=>c.text.includes('historical machine data'));
 assert.match(sentence.text,/historical machine data and maintenance records\./);assert.deepEqual(sentence.sources.map(c=>c.id),[7,8]);
 assert.equal(catalog.filter(c=>c.text.includes('Approval')).length,1);
});
test('headings and bullet facts are preserved in evidence context',()=>{
 const catalog=evidenceCatalog([{...row,text:'Required Documents\n• Passport\n• Signed application\nThe application closes on\n1 May 2028.'}]);
 assert.ok(catalog.some(c=>c.heading&&c.text==='Required Documents'));assert.ok(catalog.some(c=>c.text==='• Passport'));assert.ok(catalog.some(c=>c.text.includes('closes on 1 May 2028')));
});
test('multi-sentence evidence spanning chunks retains both actual citations',async()=>{
 const a={...row,text:'The project needs historical machine data and maintenance',startToken:0,endToken:500};
 const b={...row,id:8,index:1,text:'machine data and maintenance records. Approval is also required.',startToken:450,endToken:510};
 const result=await answerQuestion(1,'What is needed?',{...deps,retrieve:async()=>[a,b],generate:async()=> 'Machine data and approval are needed.'});
 assert.match(result.answer,/maintenance records/);assert.match(result.answer,/Approval/);assert.deepEqual(result.sources.map(s=>s.chunkIndex),[0,1]);
});
test('uncertain verification cannot authorize an answer',async()=>{
 const result=await answerQuestion(1,'Budget?',{...deps,generate:async()=> 'A million dollars.',verify:async()=> 'Maybe'});assert.equal(result.answer,NOT_FOUND);
});
test('context budgeting measures the full prompt and rejects invalid token counts',async()=>{
 const context=await selectContext('why',[row,{...row,id:8,text:'too large'}],{tokenLength:async s=>s.includes('too large')?MAX_INPUT_TOKENS+1:100,buildPrompt:(_,c)=>c.map(x=>x.text).join(' ')});assert.equal(context.length,1);
 await assert.rejects(selectContext('why',[row],{tokenLength:async()=>undefined,buildPrompt:()=> 'prompt'}),/token count/);
});
test('trace captures exact prompt, raw selection and output; production disables callbacks',async()=>{
 let trace;await answerQuestion(1,'When?',{...deps,generate:async()=> '14 March 2027',onTrace:t=>trace=t});assert.equal(trace.rawOutput,'14 March 2027');assert.equal(trace.finalOutput.answer,row.text);assert.equal(trace.supportChecks[0].raw,'YES');assert.equal(trace.promptTokens,100);
 const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';try{let called=false;await answerQuestion(1,'When?',{...deps,generate:async()=> '14 March 2027',onTrace:()=>{called=true;}});assert.equal(called,false);}finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
});
