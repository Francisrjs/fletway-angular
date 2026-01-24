module.exports = {
  content: [
    './src/**/*.{html,ts,tsx,scss,css}',
    './node_modules/flowbite/**/*.js'
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Colores oficiales Fletway según reglas
        fletway: {
          orange: "#FF6F00",      // Naranja principal
          "blue-gray": "#455A64",  // Azul Grisáceo
          white: "#FFFFFF",         // Blanco
          beige: "#FBE9E7",        // Beige Claro
        },
        // Alias para mantener compatibilidad y facilitar uso
        primary: "#FF6F00",         // Naranja principal
        "blue-gray": "#455A64",    // Azul Grisáceo
        "light-beige": "#FBE9E7",   // Beige Claro

        // Variantes de naranja para estados
        orange: {
          50: "#FFF3E0",
          100: "#FFE0B2",
          200: "#FFCC80",
          300: "#FFB74D",
          400: "#FFA726",
          500: "#FF6F00",    // Principal
          600: "#F57C00",
          700: "#EF6C00",
          800: "#E65100",
          900: "#BF360C",
        },

        // Variantes de azul grisáceo
        "gray-blue": {
          50: "#ECEFF1",
          100: "#CFD8DC",
          200: "#B0BEC5",
          300: "#90A4AE",
          400: "#78909C",
          500: "#455A64",    // Principal
          600: "#546E7A",
          700: "#37474F",
          800: "#263238",
          900: "#102027",
        },

        // Colores neutros para textos y fondos
        gray: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#EEEEEE",
          300: "#E0E0E0",
          400: "#BDBDBD",
          500: "#9E9E9E",
          600: "#757575",
          700: "#616161",
          800: "#424242",
          900: "#212121",
        },
      },
      // Sombras personalizadas con colores de marca
      boxShadow: {
        "fletway": "0 4px 14px 0 rgba(255, 111, 0, 0.15)",
        "fletway-lg": "0 10px 25px -5px rgba(255, 111, 0, 0.2)",
        "blue-gray": "0 4px 14px 0 rgba(69, 90, 100, 0.15)",
      },
      // Espaciado personalizado para consistencia
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      fontFamily: {
      body: [
        "Inter",
        "ui-sans-serif",
        "system-ui",
        "-apple-system",
        "system-ui",
        "Segoe UI",
        "Roboto",
        "Helvetica Neue",
        "Arial",
        "Noto Sans",
        "sans-serif",
        "Apple Color Emoji",
        "Segoe UI Emoji",
        "Segoe UI Symbol",
        "Noto Color Emoji",
      ],
      sans: [
        "Inter",
        "ui-sans-serif",
        "system-ui",
        "-apple-system",
        "system-ui",
        "Segoe UI",
        "Roboto",
        "Helvetica Neue",
        "Arial",
        "Noto Sans",
        "sans-serif",
        "Apple Color Emoji",
        "Segoe UI Emoji",
        "Segoe UI Symbol",
        "Noto Color Emoji",
      ],
    },
  },
  plugins: [
    require('flowbite/plugin')
  ]
};
