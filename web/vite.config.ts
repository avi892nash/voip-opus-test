import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Vite dev-server proxy target. This is read INSIDE the dev server (Node
  // process) so it can use names that only resolve in the dev server's
  // network — e.g. the Docker service name `server` when running via
  // docker-compose. It is NOT baked into the browser bundle.
  //
  // The browser-facing URL is `VITE_API_URL` / `VITE_WS_URL` (when set), or
  // relative URLs (when unset). Relative URLs flow through this proxy.
  const proxyTarget = env.VITE_PROXY_TARGET || env.VITE_API_URL || 'http://localhost:8000'
  const wsProxyTarget = proxyTarget.replace(/^ws/, 'http')

  return {
    plugins: [
      react(),
      basicSsl(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png', 'audioProcessor.js'],
        manifest: {
          name: 'VoIP & Opus — Learn and Call',
          short_name: 'VoIP Opus',
          description:
            'Learn how VoIP and the Opus audio codec work, play with interactive demos, and make real voice calls in the browser.',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          categories: ['education', 'communication'],
          icons: [
            { src: '/icons/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icons/favicon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,wasm}'],
          navigateFallbackDenylist: [/^\/api/, /^\/ws/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts', expiration: { maxEntries: 20 } },
            },
          ],
        },
      }),
    ],
    server: {
      port: 5174,
      strictPort: true,
      host: true, // listen on LAN for mobile testing
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
        '/ws': { target: wsProxyTarget, changeOrigin: true, ws: true },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  }
})
