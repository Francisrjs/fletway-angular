const fs = require("fs");
const dotenv = require("dotenv");

// Cargar variables de .env.local
const envConfig = dotenv.config({ path: ".env.local" });

if (envConfig.error) {
  console.error("Error cargando .env.local:", envConfig.error);
  process.exit(1);
}

const env = envConfig.parsed;

// Crear el contenido del archivo environment.dev.ts
const envFileContent = `export const environment = {
  production: false,
  supabaseUrl: '${env.NG_APP_SUPABASE_URL || ""}',
  supabaseKey: '${env.NG_APP_SUPABASE_KEY || ""}',
  apiUrl: '${"http://127.0.0.1:5000"}',
};
`;

// Escribir el archivo
const targetPath = "./src/enviroments/enviroment.dev.ts";
fs.writeFileSync(targetPath, envFileContent);

console.log("✅ Variables de entorno cargadas desde .env.local");
console.log(`   - SUPABASE_URL: ${env.NG_APP_SUPABASE_URL ? "✓" : "✗"}`);
console.log(`   - SUPABASE_KEY: ${env.NG_APP_SUPABASE_KEY ? "✓" : "✗"}`);
console.log(`   - API_URL: ${"http://127.0.0.1:5000"}`);
