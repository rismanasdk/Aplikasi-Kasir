import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ip backend - gunakan IP lokal untuk network access
const DEFAULT_BACKEND_HOST = process.env.VITE_BACKEND_HOST || process.env.VITE_NETWORK_IP || '192.168.0.9' 

const normalizeAPITarget = (target?: string) => {
  if (!target) {
    return `http://${DEFAULT_BACKEND_HOST}:5000`
  }

  try {
    const parsed = new URL(target)
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
      parsed.hostname = DEFAULT_BACKEND_HOST
    }
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return `http://${DEFAULT_BACKEND_HOST}:5000`
  }
}

const getAPITarget = () => {
  // Jika di-set via environment variable, gunakan itu
  const configuredTarget = process.env.VITE_API_BASE_URL || process.env.VITE_API_URL || process.env.VITE_IPBE
  if (configuredTarget) {
    return normalizeAPITarget(configuredTarget)
  }
  // Default: IP LAN untuk development agar tidak mentok ke localhost.
  return normalizeAPITarget()
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
