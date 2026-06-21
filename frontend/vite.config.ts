import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ip backend - gunakan IP lokal untuk network access
const getAPITarget = () => {
  // Jika di-set via environment variable, gunakan itu
  if (process.env.VITE_API_URL) {
    return process.env.VITE_API_URL
  }
  // Default: localhost untuk development lokal
  return process.env.VITE_NETWORK_IP 
    ? `http://${process.env.VITE_NETWORK_IP}:5000`
    : 'http://localhost:5000'
}

const API_TARGET = getAPITarget()

export default defineConfig({
  plugins: [react()],
  envDir: '.',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    allowedHosts: ['*'],
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    
    // HMR config untuk network access
    hmr: process.env.VITE_NETWORK_IP 
      ? {
          protocol: 'http',
          host: process.env.VITE_NETWORK_IP,
          port: 5173,
        }
      : true, // Vite auto-detect untuk localhost
    
    // Proxy API requests ke backend
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          console.log(`📤 Proxying: ${path} → ${API_TARGET}${path}`);
          return path;
        },
      },
    }
  }
})
