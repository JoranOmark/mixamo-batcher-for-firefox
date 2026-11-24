import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import copy from 'rollup-plugin-copy'

export default defineConfig({
  build: {
    sourcemap: false,
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  plugins: [
    svelte(),
    copy({
      targets: [{ src: ['LICENSE', 'manifest.json', 'permission.html', 'icon*'], dest: 'dist' }],
    }),
  ],
})
