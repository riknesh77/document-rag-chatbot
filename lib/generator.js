const {getPipeline, withInference, MODELS} = require('./localModels');
const {getEncoding} = require('js-tiktoken');
const MAX_NEW_TOKENS = 160;
let tokenizer;
function provider() {
  const selected = process.env.GENERATION_PROVIDER || (process.env.VERCEL ? 'groq' : 'local');
  if (!['local', 'groq'].includes(selected) || (process.env.VERCEL && selected === 'local')) {
    throw new Error('Configure a supported hosted generation provider on Vercel.');
  }
  return selected;
}
function modelName() {
  return provider() === 'local' ? MODELS.generation[1] : (process.env.GENERATION_MODEL || 'openai/gpt-oss-20b');
}
async function generateAnswer(prompt, {deadline = Date.now() + 30000, fetchImpl = fetch} = {}) {
  if (typeof window !== 'undefined') throw new Error('Generation is server-only.');
  if (provider() === 'local') return withInference(async () => {
    const generator = await getPipeline('generation');
    const result = await generator([{role:'user',content:prompt}], {max_new_tokens:MAX_NEW_TOKENS,do_sample:false});
    return result[0].generated_text.at(-1).content.trim();
  });
  if (!process.env.GROQ_API_KEY?.trim()) throw new Error('Hosted generation is not configured.');
  // cl100k is a budgeting estimate, not the hosted model's exact tokenizer.
  // A separate UTF-8 byte ceiling leaves ample space in a >=32K context model.
  if (Buffer.byteLength(prompt, 'utf8') > 30000) throw new Error('Generation input exceeds the hosted context budget.');
  const remaining = Math.min(30000, deadline - Date.now());
  if (remaining <= 0) throw new Error('Generation timed out. Please retry.');
  try {
    const model = modelName();
    const response = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
      method:'POST', redirect:'error', signal:AbortSignal.timeout(remaining),
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.GROQ_API_KEY}`},
      body:JSON.stringify({model,messages:[{role:'user',content:prompt}],temperature:0,
        // GPT-OSS includes internal reasoning in its completion-token allowance.
        max_completion_tokens:model.startsWith('openai/gpt-oss-') ? 1024 : MAX_NEW_TOKENS,
        ...(model.startsWith('openai/gpt-oss-') && {reasoning_effort:'low'})}),
    });
    // Never forward provider bodies, headers, keys, or network errors to clients.
    if (!response.ok) throw new Error('Provider request failed');
    const result = await response.json();
    const choice = result.choices?.[0];
    const text = choice?.message?.content;
    if (choice?.finish_reason !== 'stop' || typeof text !== 'string' || !text.trim() || text.length > 8000) {
      throw new Error('Invalid or truncated completion');
    }
    return text.trim();
  } catch {
    throw new Error('Hosted generation unavailable. Check provider configuration and quota, then retry.');
  }
}
async function countTokens(text) {
  if (provider() !== 'local') {
    tokenizer ||= getEncoding('cl100k_base');
    return tokenizer.encode(text, [], []).length + 32;
  }
  const generator = await getPipeline('generation');
  return generator.tokenizer.apply_chat_template([{role:'user',content:text}], {
    tokenize:true,return_tensor:false,return_dict:false,add_generation_prompt:true,
  }).length;
}
module.exports = {generateAnswer,countTokens,modelName,MAX_NEW_TOKENS,
  get MODEL() { return modelName(); },
};
