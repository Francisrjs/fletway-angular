import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Cargar variables de entorno desde .env.local
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    define: {
      'import.meta.env.NG_APP_SUPABASE_URL': JSON.stringify(env.NG_APP_SUPABASE_URL),
      'import.meta.env.NG_APP_SUPABASE_KEY': JSON.stringify(env.NG_APP_SUPABASE_KEY),
      'import.meta.env.NG_APP_API_URL': JSON.stringify(env.NG_APP_API_URL),
    },
  };
});
