import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// Changing the domain only takes this value.
const site = 'https://nicolassantini.pages.dev';

export default defineConfig({
  site,
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  integrations: [sitemap()],
  build: {
    // The CSP allows only same-origin files, so nothing may be inlined.
    inlineStylesheets: 'never',
  },
  vite: {
    build: { assetsInlineLimit: 0 },
  },
});
