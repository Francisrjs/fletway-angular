// Variables inyectadas por Netlify durante el build
// Configurar en Netlify Dashboard → Environment Variables
export const environment = {
  production: true,
  supabaseUrl: '${NG_APP_SUPABASE_URL}',
  supabaseKey: '${NG_APP_SUPABASE_KEY}',
  apiUrl: '${NG_APP_API_URL}',
};
