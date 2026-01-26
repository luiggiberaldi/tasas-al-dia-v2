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
      manifest: {
        name: 'TasasAlDía - Monitor Financiero',
        short_name: 'TasasAlDía',
        description: 'Monitor de tasas de cambio y calculadora financiera en Venezuela',
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
        shortcuts: [
          {
            name: "🎙️ Asistente IA",
            short_name: "Asistente",
            description: "Habla con Mister Cambio",
            url: "/",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }]
          }
        ]
      }
    })
  ],
})