import { uiTranslationPlugin } from './scripts/ui-text.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

function firestorePatchPlugin() {
  return {
    name: 'firestore-patch-plugin',
    transform(code: string, id: string) {
      let modified = false;
      let newCode = code;
      if (id.includes('firestore')) {
        if (newCode.includes('for (const r of e.Eu.get(t))')) {
          newCode = newCode.replace(/for \(const r of e\.Eu\.get\(t\)\)/g, 'for (const r of (e.Eu.get(t) || []))');
          modified = true;
        }
        if (newCode.includes('if (s.length > 1)')) {
          newCode = newCode.replace(/if \(s\.length > 1\)/g, 'if (s && s.length > 1)');
          modified = true;
        }
        if (newCode.includes('1 === i.length')) {
          newCode = newCode.replace(/1 === i\.length/g, 'i && 1 === i.length');
          modified = true;
        }
      }
      if (id.includes('react-dom') || newCode.includes('Expected static flag was missing')) {
        if (newCode.includes('Expected static flag was missing')) {
          newCode = newCode.replace(/error\('Internal React error: Expected static flag was missing\. Please ' \+ 'notify the React team\.'\);/g, "/* Suppressed React internal static flag warning */");
          modified = true;
        }
      }
      if (modified) {
        return { code: newCode, map: null };
      }
      return null;
    }
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: false,
        ws: false,
      },
      plugins: [
        uiTranslationPlugin(),
        firestorePatchPlugin(),
        react(),
        tailwindcss(),
        VitePWA({
          registerType: 'prompt',
          devOptions: {
            enabled: false
          },
          workbox: {
            maximumFileSizeToCacheInBytes: 40 * 1024 * 1024,
            globPatterns: ['**/*.{js,css,html,ico,png,svg}']
          },
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
          manifest: {
            name: 'AgriMap Pro',
            short_name: 'AgriMap',
            description: 'Advanced Agricultural Management & Mapping Platform',
            theme_color: '#16a34a',
            icons: [
              {
                src: 'https://picsum.photos/192/192?random=1',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'https://picsum.photos/512/512?random=1',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: 'https://picsum.photos/512/512?random=1',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          }
        })
      ],
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'leaflet',
          'react-leaflet',
          '@turf/turf',
          'firebase/app',
          'firebase/auth',
          'firebase/firestore',
          'lucide-react',
          '@google/genai',
          'd3',
          'three'
        ]
      },
      build: {
        target: 'esnext',
        chunkSizeWarningLimit: 3000,
        cssCodeSplit: true,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('three')) return 'vendor-three';
                if (id.includes('leaflet')) return 'vendor-maps';
                if (id.includes('firebase')) return 'vendor-firebase';
                if (id.includes('react')) return 'vendor-react';
              }
            }
          }
        }
      },
      define: {
        global: 'globalThis',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
