# Popup Modal System - Documentación

## ✅ **Sistema de Popup Modal Completo**

Un sistema de modales de confirmación con 3 tipos diferentes y funciones de aceptar/cancelar.

## 📁 **Archivos creados:**

1. `popup-modal.ts` - Componente individual del modal
2. `popup-modal.html` - Template con íconos y estilos para cada tipo
3. `popup-modal.scss` - Animaciones y estilos
4. `popup-modal.service.ts` - Servicio para gestionar modales globalmente
5. `popup-modal-container.ts` - Contenedor para mostrar modales
6. `index.ts` - Barrel export

## 🎨 **Tipos de modales disponibles:**

### **Warning (Amarillo) ⚠️**

- Ícono de advertencia
- Color amarillo
- Para confirmaciones generales

### **Success (Verde) ✅**

- Ícono de check
- Color verde
- Para acciones positivas

### **Danger (Rojo) ❌**

- Ícono de alerta
- Color rojo
- Para acciones destructivas

## 🚀 **Cómo usar:**

### **1. Usando el servicio (Recomendado):**

```typescript
import { inject } from "@angular/core";
import { PopupModalService } from "./shared/modal/popup/popup-modal.service";

export class MiComponente {
  private popupModalService = inject(PopupModalService);

  confirmarEliminar() {
    this.popupModalService.showDanger(
      "¿Eliminar elemento?",
      "Esta acción no se puede deshacer",
      () => {
        // Función onAccept
        console.log("Usuario confirmó eliminar");
        this.eliminarElemento();
      },
      () => {
        // Función onCancel
        console.log("Usuario canceló");
      },
    );
  }

  confirmarGuardar() {
    this.popupModalService.showSuccess(
      "¿Guardar cambios?",
      "Los datos se guardarán permanentemente",
      () => this.guardarDatos(),
      () => console.log("Guardado cancelado"),
    );
  }

  mostrarAdvertencia() {
    this.popupModalService.showWarning(
      "Datos incompletos",
      "¿Deseas continuar sin completar todos los campos?",
      () => this.continuarSinCompletar(),
      () => this.volverAFormulario(),
    );
  }
}
```

### **2. Usando el componente directamente:**

```html
<app-popup-modal [isVisible]="showModal" title="¿Confirmar acción?" description="Esta acción tendrá consecuencias importantes" type="danger" acceptText="Sí, eliminar" cancelText="No, cancelar" (accept)="onAccept()" (cancelled)="onCancel()" (closed)="onClose()" />
```

## 🎛️ **Propiedades del componente:**

### **Inputs:**

- `isVisible: boolean` - Controla si el modal está visible
- `title: string` - Título del modal
- `description: string` - Descripción/mensaje del modal
- `type: 'warning' | 'success' | 'danger'` - Tipo de modal
- `acceptText: string` - Texto del botón de aceptar
- `cancelText: string` - Texto del botón de cancelar
- `acceptButtonClass: string` - Clases CSS personalizadas para botón aceptar
- `cancelButtonClass: string` - Clases CSS personalizadas para botón cancelar

### **Outputs:**

- `accept` - Se emite cuando se presiona el botón de aceptar
- `cancelled` - Se emite cuando se presiona el botón de cancelar
- `closed` - Se emite cuando se cierra el modal

## ✨ **Características:**

- **Animaciones suaves** de entrada y salida
- **Cierre con ESC** automático
- **Cierre al hacer click en overlay**
- **Foco automático** y accesibilidad completa
- **Responsive** para móviles y desktop
- **Customizable** - colores y textos personalizables
- **Gestión global** con servicio
- **Prevención de scroll** del body

## 🎯 **Ejemplos prácticos:**

### **Eliminar usuario:**

```typescript
eliminarUsuario(userId: number) {
  this.popupModalService.showDanger(
    '¿Eliminar usuario?',
    'El usuario será eliminado permanentemente del sistema',
    () => {
      this.userService.delete(userId).subscribe({
        next: () => this.toastService.showSuccess('Usuario eliminado'),
        error: () => this.toastService.showDanger('Error al eliminar')
      });
    }
  );
}
```

### **Cerrar sesión:**

```typescript
logout() {
  this.popupModalService.showWarning(
    '¿Cerrar sesión?',
    'Perderás cualquier trabajo no guardado',
    () => this.authService.signOut(),
    () => console.log('Sesión mantenida')
  );
}
```

### **Guardar borrador:**

```typescript
guardarBorrador() {
  this.popupModalService.showSuccess(
    '¿Guardar como borrador?',
    'Podrás continuar editando más tarde',
    () => this.saveAsDraft(),
    () => this.continuarEditando()
  );
}
```

## 🔧 **Configuración:**

El PopupModalContainer ya está agregado al `app.html`, así que está listo para usar en toda la aplicación.

**¡Tu sistema de popup modales está completo y funcionando!** 🎉
