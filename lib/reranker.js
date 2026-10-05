const {getPipeline,withInference}=require('./localModels');
async function rankEvidence(question,catalog) {
 const candidates=catalog.filter(c=>!c.heading);
 return withInference(async()=>{
  const pipe=await getPipeline('reranking');
  for(let offset=0;offset<candidates.length;offset+=8) {
   const batch=candidates.slice(offset,offset+8);
   const inputs=pipe.tokenizer(batch.map(()=>question),{text_pair:batch.map(c=>c.section+'\n'+c.text),padding:true,truncation:true});
   const {logits}=await pipe.model(inputs);
   batch.forEach((c,i)=>c.relevance=logits.data[i]);
  }
  const best=[...candidates].sort((a,b)=>b.relevance-a.relevance).slice(0,8);
  // Neighboring evidence preserves qualifications and multi-sentence answers.
  const ids=new Set(best.map(c=>c.id));
  for(const c of best.slice(0,3))for(const neighbor of candidates.filter(n=>Math.abs(n.id-c.id)===1))ids.add(neighbor.id);
  return candidates.filter(c=>ids.has(c.id));
 });
}
module.exports={rankEvidence};
