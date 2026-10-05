const {getPipeline} = require('../lib/localModels');
(async()=>{for(const kind of ['embedding','reranking','generation']) {console.log(`Preparing local ${kind} model...`);await getPipeline(kind);console.log(`${kind} ready`);}})().catch(e=>{console.error('Model setup failed:', e.code || e.name);process.exitCode=1;});
