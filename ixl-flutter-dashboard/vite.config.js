import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import https from 'https'
import dns from 'dns'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = (env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co').trim();
  const supabaseHost = supabaseUrl.replace(/^https?:\/\//, '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/supabase_api': {
          target: supabaseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase_api/, ''),
          agent: new https.Agent({
            lookup: (hostname, options, callback) => {
              if (typeof options === 'function') {
                callback = options;
                options = {};
              }
              if (hostname === supabaseHost) {
                if (options && options.all) {
                  return callback(null, [{ address: '104.18.38.10', family: 4 }]);
                }
                return callback(null, '104.18.38.10', 4);
              }
              return dns.lookup(hostname, options, callback);
            }
          })
        },
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      }
    }
  }
})
