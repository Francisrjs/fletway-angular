const fs = require("fs");
const dotenv = require("dotenv");

// Cargar variables de .env.local
const envConfig = dotenv.config({ path: ".env.local" });

if (envConfig.error) {
  console.error("Error cargando .env.local:", envConfig.error);
  process.exit(1);
}

const env = envConfig.parsed;

// Crear el contenido del archivo environment.ts para producción local
const envFileContent = `export const environment = {
  production: true,
  supabaseUrl: '${env.NG_APP_SUPABASE_URL || ""}',
  supabaseKey: '${env.NG_APP_SUPABASE_KEY || ""}',
  apiUrl: '${env.NG_APP_API_URL || "https://fletway-api-533654897399.us-central1.run.app"}',
};
`;

// Escribir el archivo environment.ts (producción)
const targetPath = "./src/enviroments/enviroment.ts";
fs.writeFileSync(targetPath, envFileContent);

// También actualizar environment.prod.ts
fs.writeFileSync("./src/enviroments/enviroment.prod.ts", envFileContent);

console.log(
  "✅ Variables de entorno cargadas desde .env.local para producción local",
);
console.log(`   - SUPABASE_URL: ${env.NG_APP_SUPABASE_URL ? "✓" : "✗"}`);
console.log(`   - SUPABASE_KEY: ${env.NG_APP_SUPABASE_KEY ? "✓" : "✗"}`);
console.log(
  `   - API_URL: ${env.NG_APP_API_URL || "https://fletway-api-533654897399.us-central1.run.app"}`,
);
