const path = require('node:path');
const os = require('node:os');
const MODELS = {
  embedding: ['feature-extraction', 'Xenova/all-MiniLM-L6-v2'],
  generation: ['text-generation', 'onnx-community/Qwen2.5-1.5B-Instruct'],
  reranking: ['text-classification', 'Xenova/ms-marco-MiniLM-L-6-v2'],
};
const pipelines = new Map();
let queue = Promise.resolve();
// Keep CPU inference bounded on ordinary development machines.
function withInference(task) {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}
async function getPipeline(kind) {
  if (typeof window !== 'undefined') throw new Error('Local models are server-only.');
  if (process.env.VERCEL && kind === 'generation') throw new Error('Local generation is disabled on Vercel. Configure a hosted provider.');
  if (!pipelines.has(kind)) {
    const promise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      if (process.env.VERCEL) {
        // These two small models are packaged during the build. Runtime is read-only
        // and offline: a missing artifact fails rather than downloading Qwen/cache.
        env.localModelPath = path.join(process.cwd(), 'server-models') + path.sep;
        env.allowLocalModels = true;
        env.allowRemoteModels = false;
        env.useFSCache = false;
      } else {
        env.cacheDir = path.join(process.cwd(), '.cache', 'models');
        env.allowLocalModels = false;
      }
      const [task, model] = MODELS[kind];
      return pipeline(task, model, { device: 'cpu', dtype: kind === 'generation' ? 'q4' : 'q8', session_options: { intraOpNumThreads: process.env.VERCEL ? 1 : Math.min(4, os.availableParallelism()), interOpNumThreads: 1 } });
    })();
    pipelines.set(kind, promise);
    promise.catch(() => pipelines.delete(kind));
  }
  return pipelines.get(kind);
}
module.exports = { getPipeline, withInference, MODELS };
