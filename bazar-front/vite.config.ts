import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node', // núcleo é puro, não precisa de DOM
    include: ['src/**/*.test.ts'],
  },
});
