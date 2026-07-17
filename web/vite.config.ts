import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isAppsScript = mode === 'apps-script';

  return {
    plugins: [
      react(),
      {
        name: 'apps-script-htmlservice-safe-js',
        apply: 'build',
        generateBundle(_, bundle) {
          if (!isAppsScript) return;

          for (const asset of Object.values(bundle)) {
            if (asset.type === 'chunk') {
              asset.code = asset.code.replaceAll('javascript:', 'java" + "script:');
            }
          }
        }
      }
    ],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      target: isAppsScript ? 'es2019' : 'modules',
      sourcemap: false,
      minify: isAppsScript ? false : 'esbuild',
      modulePreload: isAppsScript ? false : undefined,
      rollupOptions: {
        output: {
          inlineDynamicImports: isAppsScript,
          manualChunks: isAppsScript ? undefined : undefined
        }
      }
    }
  };
});
