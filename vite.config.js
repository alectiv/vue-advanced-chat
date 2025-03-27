import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue({ customElement: true })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/index.js'),
      name: 'vue-advanced-chat',
      formats: ['es', 'umd'], // ✅ Lägg till detta
      fileName: (format) => `vue-advanced-chat.${format}.js` // ✅ Styr filnamnet
    },
    cssCodeSplit: false, // ✅ Detta gör att CSS hamnar i .js-filen
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
