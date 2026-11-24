/// <reference types="vitest" />
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { isAllowedIcalUrl } from './services/icalUrl';

/** Mirrors functions/api/ical.ts so sync also works with `npm run dev` / `preview`. */
function icalDevProxy(): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    const urlParam = new URL(req.url || '/', 'http://localhost').searchParams.get('url') || '';

    if (!isAllowedIcalUrl(urlParam)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'URL de calendario no válida' }));
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const upstream = await fetch(urlParam, { signal: controller.signal });
      if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`);
      const text = await upstream.text();
      if (text.length > 1_000_000) throw new Error('Calendario demasiado grande');
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.end(text);
    } catch (error) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Error al obtener el calendario' }));
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    name: 'airbnb-ical-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ical', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/ical', handler);
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss(), icalDevProxy()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'supabase': ['@supabase/supabase-js'],
              'pdf': ['pdfjs-dist', 'html2pdf.js'],
              'icons': ['lucide-react'],
            }
          }
        }
      },
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        css: true,
      }
    };
});
