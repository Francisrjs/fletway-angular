# Toast System - Documentación

## ¿Qué incluye el sistema de toasts?

✅ **3 tipos de toasts**: Success, Warning, Danger
✅ **Íconos distintos** para cada tipo
✅ **Auto-cerrado** configurable
✅ **Múltiples toasts** simultáneos
✅ **Animaciones** suaves
✅ **Servicio global** para usar en cualquier componente

## Archivos creados:

1. `toast.ts` - Componente individual de toast
2. `toast.html` - Template con íconos y estilos para cada tipo
3. `toast.scss` - Animaciones y estilos
4. `toast.service.ts` - Servicio para gestionar toasts globalmente
5. `toast-container.ts` - Contenedor para mostrar múltiples toasts
6. `index.ts` - Barrel export

## Cómo usar:

### 1. El ToastContainer ya está agregado en app.html

### 2. En cualquier componente, inyecta el servicio:

```typescript
import { inject } from "@angular/core";
import { ToastService } from "./shared/modal/toast/toast.service";

export class MiComponente {
  private toastService = inject(ToastService);

  mostrarNotificaciones() {
    // Toast de éxito (verde)
    this.toastService.showSuccess("¡Éxito!", "Operación completada correctamente");

    // Toast de advertencia (naranja)
    this.toastService.showWarning("Atención", "Revisa los datos ingresados");

    // Toast de error (rojo)
    this.toastService.showDanger("Error", "No se pudo procesar la solicitud");

    // Con duración personalizada (7 segundos)
    this.toastService.showSuccess("Guardado", "Datos guardados", 7000);

    // Sin auto-cerrado (duración = 0)
    this.toastService.showDanger("Error crítico", "Requiere atención", 0);
  }
}
```

### 3. Para usar un toast individual (sin servicio):

```html
<app-toast titleMessage="Mi título" typeMessage="success" message="Mi mensaje" [isVisible]="true" (closeToast)="onToastClose()" />
```

## Tipos disponibles:

- **success**: Verde con ícono de check ✅
- **warning**: Naranja con ícono de advertencia ⚠️
- **danger**: Rojo con ícono de X ❌

## Características:

- **Auto-cerrado**: Por defecto 5 segundos, configurable
- **Posición**: Fijo en top-right
- **Z-index**: 9999 (siempre visible)
- **Responsive**: Se adapta a móviles
- **Animaciones**: Slide in/out suaves
- **Accesibilidad**: Roles ARIA y eventos de teclado

## Ejemplo ya implementado:

En `detalles-solicitud-fletero.ts` ya reemplazamos los `alert()` por toasts:

- ✅ Formulario inválido → Toast warning
- ✅ Error al enviar → Toast danger
- ✅ Éxito al enviar → Toast success
