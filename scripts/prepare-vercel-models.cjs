// Download only the two CPU MiniLM models at build time, never the local LLM.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const manifest = require('./vercel-models.json');
async function prepare() {
  for (const model of manifest) for (const file of model.files) {
    const target = path.join(process.cwd(), 'server-models', model.id, file.name);
    const matches = data => createHash('sha256').update(data).digest('hex') === file.sha256;
    let data = await fs.readFile(target).catch(() => null);
    if (data && matches(data)) continue;
    data = await fs.readFile(path.join(process.cwd(), '.cache', 'models', model.id, file.name)).catch(() => null);
    if (!data || !matches(data)) {
      const response = await fetch(`https://huggingface.co/${model.id}/resolve/${model.revision}/${file.name}`, {signal: AbortSignal.timeout(120000)});
      if (!response.ok) throw new Error('Model download failed');
      data = Buffer.from(await response.arrayBuffer());
    }
    if (!matches(data)) throw new Error('Model checksum mismatch');
    await fs.mkdir(path.dirname(target), {recursive:true});
    await fs.writeFile(target, data);
  }
  console.log('Verified and prepared both MiniLM models for offline runtime.');
}
if (process.env.VERCEL || process.argv.includes('--force')) {
  prepare().catch(() => { console.error('MiniLM build preparation failed. Check access to huggingface.co and retry.'); process.exitCode = 1; });
}
