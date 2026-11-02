import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/', '.astro/', '.wrangler/', 'node_modules/', 'private/', 'public/'] },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
];
