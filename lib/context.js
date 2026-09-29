// Preserve complete retrieved chunks. A larger local model removes the old
// 480-token sentence-selection bottleneck; no similarity cutoff decides refusal.
const cleanText = text => text.replace(/\s+/g, ' ').trim();
const MAX_INPUT_TOKENS = 6144;
async function selectContext(question, retrieved, {tokenLength, buildPrompt, maxTokens=MAX_INPUT_TOKENS}) {
  const selected=[];
  const seen=new Set();
  for(const chunk of retrieved) {
    if(seen.has(chunk.id) || !chunk.text.trim()) continue;
    const candidate={text:cleanText(chunk.text),sources:[chunk]};
    const count=await tokenLength(buildPrompt(question,[...selected,candidate]));
    if(!Number.isFinite(count) || count<0) throw new Error('Invalid generation token count');
    if(count>maxTokens) continue;
    selected.push(candidate); seen.add(chunk.id);
  }
  return selected;
}
module.exports={selectContext,cleanText,MAX_INPUT_TOKENS};
