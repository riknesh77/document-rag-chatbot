const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const manifest = require('./vercel-models.json');
function traceFiles(route) {
  const files = new Set();
  for (const trace of [`.next/server/pages/api/${route}.js.nft.json`, '.next/next-server.js.nft.json']) {
    for (const file of JSON.parse(fs.readFileSync(trace)).files) files.add(path.resolve(path.dirname(trace),file));
  }
  files.add(path.resolve(`.next/server/pages/api/${route}.js`));
  return files;
}
function check() {
  for (const route of ['upload','chat']) {
    const files = traceFiles(route);
    for (const model of manifest) for (const file of model.files) {
      assert.ok(files.has(path.resolve('server-models',model.id,file.name)), 'Missing packaged MiniLM file');
    }
    assert.ok(files.has(path.resolve('node_modules/onnxruntime-node/bin/napi-v6',process.platform,process.arch,'onnxruntime_binding.node')), 'Missing native ONNX binding');
    for (const file of files) {
      const relative = path.relative(process.cwd(),file);
      assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative), 'Trace escaped the project root');
      assert.ok(!/(?:^|[\\/])\.env[^\\/]*$|(?:^|[\\/])\.cache[\\/]|Qwen.*\.onnx|flan.*\.onnx/i.test(relative), 'Private cache, secrets, or LLM weights included');
    }
    const size = [...files].reduce((sum,file)=>sum+fs.statSync(file).size,0);
    // Reserve headroom for Vercel's wrapper/runtime within the standard 250 MB.
    assert.ok(size < 240_000_000, `${route} trace exceeds deployment size budget`);
    console.log(`${route}: ${(size/1048576).toFixed(1)} MiB unique traced files including Next server; models/native binding present; private files excluded.`);
  }
}
if (require.main === module && (process.env.VERCEL || process.argv.includes('--force'))) check();
module.exports = {traceFiles,check};
