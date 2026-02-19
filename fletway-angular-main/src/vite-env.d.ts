/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly NG_APP_SUPABASE_URL: string;
  readonly NG_APP_SUPABASE_KEY: string;
  readonly NG_APP_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
