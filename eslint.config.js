// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");
const simpleImportSort = require("eslint-plugin-simple-import-sort");
module.exports = tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,

    // 👇 acá registramos el plugin
    plugins: {
      "simple-import-sort": simpleImportSort,
    },

    rules: {
      //1 - ";" al finalizar cada linea
      semi: ["error", "always"],
      //2 - Obliga a usar === y !== en lugar de == y !=
      eqeqeq: ["error", "always"],
      //3 - Limita la cantidad de parámetros en funciones/métodos a 8.
      "max-params": ["error", 8],
      //4 - Usar comillas simples ''
      quotes: ["error", "single"],
      //5 - No dejar variables o importaciones sin usar => ERROR
      //6 - Requerir el uso de const o let, NO USAR VAR LET
      "no-var": "error",
      //7- Implementación de aviso WARN si dejamos console.log => PRODUCCION FUTURA
      // "no-console": "warn",
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
);
