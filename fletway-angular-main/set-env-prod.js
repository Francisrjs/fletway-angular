const fs = require('fs');

// Leer variables de entorno de Netlify
const supabaseUrl = process.env.NG_APP_SUPABASE_URL || '';
const supabaseKey = process.env.NG_APP_SUPABASE_KEY || '';
const apiUrl = process.env.NG_APP_API_URL || '';

// Crear el contenido del archivo environment.ts
const envFileContent = `export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}',
  apiUrl: '${apiUrl}',
};
`;

// Escribir el archivo
const targetPath = './src/enviroments/enviroment.ts';
fs.writeFileSync(targetPath, envFileContent);

console.log('✅ Variables de entorno de Netlify cargadas');
console.log(`   - SUPABASE_URL: ${supabaseUrl ? '✓' : '✗'}`);
console.log(`   - SUPABASE_KEY: ${supabaseKey ? '✓' : '✗'}`);
console.log(`   - API_URL: ${apiUrl ? '✓' : '✗'}`);

// También actualizar environment.prod.ts
fs.writeFileSync('./src/enviroments/enviroment.prod.ts', envFileContent);
