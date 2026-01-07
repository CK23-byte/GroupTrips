import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client
          'supabase': ['@supabase/supabase-js'],
          // Google Maps (heavy)
          'google-maps': ['@react-google-maps/api'],
          // Date utilities
          'date-utils': ['date-fns'],
          // Icons - tree-shaken but grouped
          'icons': ['lucide-react'],
          // QR code generators
          'qr': ['qrcode', 'qrcode.react', 'react-qrcode-logo'],
        },
      },
    },
    // Increase chunk size warning threshold
    chunkSizeWarningLimit: 500,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
