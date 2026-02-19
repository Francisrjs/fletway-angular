# Fletway

Angular 18

## Tecnolgías implementadas

- Supabase (Auth)
- Flowbite (Web apps / Mobile)
- Leaflet (servicio para mapas)

### Documentación de Uso

Se encuentra en la carpeta **docs** los componentes

# Entorno de Desarrollo

Para ejecutar el proyecto en modo desarrollo, ejecuta el siguiente comando:

```bash
npm run dev
```

Asegurarse de correr el backend antes de ejecutar el frontend. En Flask dirigirse al proyecto [fletway-flask](https://github.com/matexs/fletway-flask)

# Entorno de Producción

Para ejecutar el proyecto en modo producción,
En este caso se va a usar para desplegar en Vercel. Usando el APi desplegado en backend.
ejecuta el siguiente comando:

```bash
npm run start
```

# Entonrnos de varibles

Estas variables se obtienen desde supabase y desde la documentacion.
ARCHIVO .env.local

```bash
NG_APP_SUPABASE_URL=
NG_APP_SUPABASE_KEY=
NG_APP_API_URL=
```
