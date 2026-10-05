import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
const names = ['process','require','module','console','Buffer','__dirname','globalThis','window','document','fetch','URL','Blob','FormData','AbortController','AbortSignal','setTimeout','clearTimeout'];
export default [
  { ignores: ['node_modules/**', '.next/**', '.cache/**', 'server-models/**'] },
  { files: ['**/*.js','**/*.jsx'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: Object.fromEntries(names.map(name => [name, 'readonly'])) },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...js.configs.recommended.rules, 'no-unused-vars': 'off', 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' } },
];
