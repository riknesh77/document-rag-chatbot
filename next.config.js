// Native ONNX is loaded dynamically; include its CPU library explicitly.
const nativePlatform = `${process.platform}/${process.arch}`;
const inferenceFiles = [
  './node_modules/onnxruntime-node/package.json',
  './node_modules/onnxruntime-node/dist/**',
  './node_modules/onnxruntime-common/package.json',
  './node_modules/onnxruntime-common/dist/**',
  `./node_modules/onnxruntime-node/bin/napi-v6/${nativePlatform}/**`,
  `./node_modules/@img/sharp-${process.platform}-${process.arch}/**`,
  `./node_modules/@img/sharp-libvips-${process.platform}-${process.arch}/**`,
  ...(process.env.VERCEL ? ['./server-models/Xenova/all-MiniLM-L6-v2/**', './server-models/Xenova/ms-marco-MiniLM-L-6-v2/**'] : []),
];
module.exports = {
  turbopack: {root: __dirname},
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node', 'sharp'],
  outputFileTracingIncludes: {
    '/api/upload': [...inferenceFiles,
      './node_modules/@napi-rs/canvas/**',
      `./node_modules/@napi-rs/canvas-${process.platform}-${process.arch}*/**`,
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/cmaps/**',
      './node_modules/pdfjs-dist/standard_fonts/**',
      './node_modules/pdfjs-dist/wasm/**',
    ],
    '/api/chat': inferenceFiles,
  },
  outputFileTracingExcludes: {
    'next-server': ['**/node_modules/@huggingface/.transformers-*/**'],
    '/*': [
    './.cache/**', './.env*', './tests/**',
    './node_modules/.prisma/client/*.tmp*',
    './node_modules/@huggingface/.transformers-*/**',
    // This schema uses Prisma's native library engine, not WASM/driver adapters.
    './node_modules/@prisma/client/runtime/*wasm*',
    './node_modules/@prisma/client/runtime/query_compiler*',
    './node_modules/onnxruntime-node/bin/**/libonnxruntime_providers_cuda.so',
    './node_modules/onnxruntime-node/bin/**/libonnxruntime_providers_tensorrt.so',
    ...['darwin/arm64', 'darwin/x64', 'linux/arm64', 'linux/x64', 'win32/arm64', 'win32/x64']
      .filter(p => p !== nativePlatform).map(p => `./node_modules/onnxruntime-node/bin/napi-v6/${p}/**`),
  ]},
};
