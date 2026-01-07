import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Cast process to any to avoid TypeScript error where the Process type definition might miss cwd()
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    define: {
      // Safely expose API_KEY to the client-side code
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Polyfill simple process.env checks without breaking the app
      'process.env.NODE_ENV': JSON.stringify(mode),
    }
  };
});