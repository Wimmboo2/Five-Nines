import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Only index.html is a build input. dev/ pages (the sim harness) are served by
// `vite dev` for testing but never bundled into dist/.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: 'index.html',
    },
  },
  test: {
    include: ['tests/**/*.test.js'],
  },
});
