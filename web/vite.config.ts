import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => {
  const isAppsScript = mode === 'apps-script';

  return {
    plugins: [
      react(),
      ...(isAppsScript ? [viteSingleFile()] : [])
    ],
    build: {
      outDir: 'dist',
      target: isAppsScript ? 'es2019' : 'modules',
      sourcemap: false,
      minify: isAppsScript ? false : 'esbuild'
    }
  };
});
