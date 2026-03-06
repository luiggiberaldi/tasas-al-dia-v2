import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Archivos estáticos que deben estar disponibles offline
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Precios Al Día — Revendedores',
        short_name: 'PreciosAlDía',
        description: 'App de precios, calculadora y monitor de tasas para revendedores en Venezuela',
        theme_color: '#0f172a', // Color de la barra de estado en Android
        background_color: '#0f172a', // Color de fondo al abrir la app (Splash screen)
        display: 'standalone', // Modo app nativa (sin barra de navegador)
        orientation: 'portrait', // Bloquear rotación si lo prefieres
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Importante para iconos adaptables en Android
          }
        ],

      }
    })
  ],
})