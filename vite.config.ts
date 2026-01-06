import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  define: {
    // Polyfill process.env for compatibility with specific libraries if needed
    'process.env': {} 
  }
});