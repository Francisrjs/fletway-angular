# Role routing & fletero detection plan

Este plan garantiza que cada rol solo acceda a sus rutas y que, si `isFletero` es `null`, consultemos `vista_es_fletero` y cacheemos el resultado antes de permitir navegación.

1. **Revisar estado actual del enrutado y guards**
   - Ver cómo `privateGuard` y `publicGuard` usan `AuthService.userState` y determinar si ya exponen `isFletero` / `isFleteroLoading`.
   - Confirmar rutas duplicadas en `app.routes.ts` y `module-shell` para evitar conflictos.

2. **Resolver rol cuando `isFletero` es `null`**
   - Si el signal aún no sabe el rol, llamar a Supabase (`vista_es_fletero`) tal como indica `/supabase-consultas`, logueando el query.
   - Guardar el resultado (boolean) en `userState` y también en `localStorage`/`sessionStorage` para evitar consultas repetidas; invalidar cache si el usuario cambia de sesión.
   - Mostrar loader/bloquear navegación hasta tener respuesta para evitar flicker.

3. **Definir guards específicos por rol**
   - Crear guardas `clienteGuard` y `fleteroGuard` (o extender `privateGuard`) que verifiquen `isFletero` y bloqueen acceso contrario.
   - Incluir feedback (redirect + toast + logs) cuando un usuario intenta acceder a una ruta que no le pertenece.

4. **Actualizar configuración de rutas**
   - Aplicar `fleteroGuard` a rutas `/fletero`, `/fletero/detalle/:id`, `/fletero/historial`.
   - Aplicar `clienteGuard` a rutas `/cliente`, `/cliente/nuevaSolicitud`, `/cliente/detallePresupuesto/:id`.
   - Asegurar rutas base (`''`) direccionan al módulo adecuado según rol (p.ej. resolver en guard inicial).

5. **Validar flujos y estados edge**
   - Probar login como fletero y cliente para confirmar accesos.
   - Verificar cambios de rol dinámicos (p.ej. `isFleteroLoading` true) mostrando loaders antes de permitir navegación.
   - Añadir pruebas manuales/logs (serial monitor) para rutas restringidas y para la consulta a `vista_es_fletero`.
