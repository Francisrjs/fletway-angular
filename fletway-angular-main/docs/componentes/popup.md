# PopupComponent

Componente reutilizable para mostrar contenido en un modal/popup centrado con soporte para componentes dinámicos.

## 📍 Ubicación

```
src/app/shared/features/popup/
```

## 🎯 Propósito

Proporcionar un sistema de modales flexible que puede mostrar tanto contenido proyectado (ng-content) como componentes dinámicos con inputs y outputs.

## 📥 Inputs

| Input             | Tipo                                     | Default     | Descripción                           |
| ----------------- | ---------------------------------------- | ----------- | ------------------------------------- |
| `isOpen`          | `boolean`                                | `false`     | Controla visibilidad del popup        |
| `title`           | `string`                                 | `''`        | Título del popup                      |
| `size`            | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'lg'`      | Tamaño del popup                      |
| `showCloseButton` | `boolean`                                | `true`      | Muestra/oculta botón de cerrar        |
| `closeOnBackdrop` | `boolean`                                | `true`      | Permite cerrar al clickear fondo      |
| `customComponent` | `Type<any>`                              | `undefined` | Componente a renderizar dinámicamente |
| `componentInputs` | `{ [key: string]: any }`                 | `undefined` | Inputs para el componente dinámico    |

## 📤 Outputs

| Output             | Tipo                                         | Descripción                           |
| ------------------ | -------------------------------------------- | ------------------------------------- |
| `close`            | `EventEmitter<void>`                         | Emite cuando se cierra el popup       |
| `componentOutputs` | `EventEmitter<{ event: string; data: any }>` | Emite eventos del componente dinámico |

## 🎨 Tamaños Disponibles

| Size   | Max Width            | Uso Recomendado                 |
| ------ | -------------------- | ------------------------------- |
| `sm`   | `max-w-sm` (384px)   | Confirmaciones, alertas simples |
| `md`   | `max-w-2xl` (672px)  | Formularios pequeños            |
| `lg`   | `max-w-4xl` (896px)  | Formularios medianos, detalles  |
| `xl`   | `max-w-6xl` (1152px) | Contenido extenso               |
| `full` | `max-w-full mx-4`    | Vista completa (con margen)     |

## 💻 Ejemplo 1: Contenido Proyectado

```typescript
import { Component } from "@angular/core";
import { PopupComponent } from "@shared/features/popup";

@Component({
  selector: "app-mi-componente",
  standalone: true,
  imports: [PopupComponent],
  template: `
    <button (click)="abrirPopup()">Abrir Popup</button>

    <app-popup [isOpen]="popupAbierto" title="Información del Pedido" size="md" [closeOnBackdrop]="true" (close)="cerrarPopup()">
      <div class="space-y-4">
        <p>Contenido personalizado aquí</p>
        <button (click)="guardar()" class="px-4 py-2 bg-orange-500 text-white rounded-lg">Guardar</button>
      </div>
    </app-popup>
  `,
})
export class MiComponente {
  popupAbierto = false;

  abrirPopup(): void {
    this.popupAbierto = true;
  }

  cerrarPopup(): void {
    this.popupAbierto = false;
  }

  guardar(): void {
    // Lógica de guardado
    this.cerrarPopup();
  }
}
```

## 💻 Ejemplo 2: Componente Dinámico

### Componente a Mostrar (MapaComponent)

```typescript
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { Solicitud } from "@core/layouts/solicitud";

@Component({
  selector: "app-mapa",
  standalone: true,
  template: `
    <div class="h-96">
      <p>Mostrando mapa para: {{ solicitud?.detalles_carga }}</p>
      <button (click)="marcarEntregado()">Marcar como Entregado</button>
    </div>
  `,
})
export class MapaComponent {
  @Input() solicitud!: Solicitud;
  @Output() entregado = new EventEmitter<void>();

  marcarEntregado(): void {
    this.entregado.emit();
  }
}
```

### Componente Padre

```typescript
import { Component } from "@angular/core";
import { PopupComponent } from "@shared/features/popup";
import { MapaComponent } from "./mapa.component";
import { Solicitud } from "@core/layouts/solicitud";

@Component({
  selector: "app-solicitudes",
  standalone: true,
  imports: [PopupComponent],
  template: `
    <button (click)="abrirMapaEnPopup(solicitud)">Ver Mapa</button>

    <app-popup [isOpen]="mapaPopupAbierto" title="Ubicación del Pedido" size="xl" [customComponent]="mapaComponent" [componentInputs]="mapaInputs" (close)="cerrarMapaPopup()" (componentOutputs)="manejarEventoMapa($event)"></app-popup>
  `,
})
export class SolicitudesComponent {
  mapaPopupAbierto = false;
  mapaComponent = MapaComponent;
  mapaInputs: any = {};
  solicitud!: Solicitud;

  abrirMapaEnPopup(solicitud: Solicitud): void {
    this.solicitud = solicitud;
    this.mapaInputs = { solicitud: solicitud };
    this.mapaPopupAbierto = true;
  }

  cerrarMapaPopup(): void {
    this.mapaPopupAbierto = false;
  }

  manejarEventoMapa(evento: { event: string; data: any }): void {
    if (evento.event === "entregado") {
      console.log("Pedido marcado como entregado");
      this.cerrarMapaPopup();
    }
  }
}
```

## 💻 Ejemplo 3: Abrir Foto en Popup

```typescript
import { Component } from "@angular/core";
import { PopupComponent } from "@shared/features/popup";

@Component({
  selector: "app-galeria",
  standalone: true,
  imports: [PopupComponent],
  template: `
    <img [src]="foto" (click)="verFotoGrande(foto)" class="cursor-pointer" />

    <app-popup [isOpen]="fotoPopupAbierta" title="Vista de Imagen" size="xl" (close)="cerrarFoto()">
      <img [src]="fotoSeleccionada" class="w-full h-auto" />
    </app-popup>
  `,
})
export class GaleriaComponent {
  fotoPopupAbierta = false;
  fotoSeleccionada = "";
  foto = "https://example.com/foto.jpg";

  verFotoGrande(url: string): void {
    this.fotoSeleccionada = url;
    this.fotoPopupAbierta = true;
  }

  cerrarFoto(): void {
    this.fotoPopupAbierta = false;
  }
}
```

## 🎨 Características

### Animaciones

- **Backdrop**: Fade in (0.2s)
- **Contenido**: Scale in (0.2s)
- Transiciones suaves y profesionales

### Backdrop

- Fondo negro con opacidad 50%
- Efecto blur sutil
- Clickeable para cerrar (configurable)

### Accesibilidad

- `role="dialog"`
- `aria-modal="true"`
- `aria-label` con el título
- Focus trap automático
- Botón de cerrar con aria-label

### Responsividad

- Max-height: 90vh con scroll interno
- Padding responsive
- Mobile-first approach

## 🔧 Métodos Públicos

| Método                   | Descripción                                    |
| ------------------------ | ---------------------------------------------- |
| `onClose()`              | Cierra el popup y destruye componente dinámico |
| `stopPropagation(event)` | Previene cierre al clickear contenido          |

## 📊 Getters

| Getter        | Retorno  | Descripción             |
| ------------- | -------- | ----------------------- |
| `sizeClasses` | `string` | Clases CSS según tamaño |

## ⚠️ Notas Importantes

1. **Componentes dinámicos**: Deben ser standalone
2. **Outputs del componente**: Se capturan automáticamente
3. **Ciclo de vida**: El componente dinámico se destruye al cerrar
4. **Z-index**: Usa `z-50` para estar sobre otros elementos

## 🎨 Personalización

```typescript
// Cambiar estilos globales en el componente
const customStyles = {
  backdrop: "bg-blue-900/70",
  container: "bg-gray-100",
  header: "bg-gradient-to-r from-orange-500 to-red-500",
};
```

## 🔗 Dependencias

```typescript
import { CommonModule } from "@angular/common";
```

Componente standalone sin dependencias externas.

## 📦 Export

```typescript
export { PopupComponent };
```

## 🚀 Casos de Uso Comunes

1. **Ver mapa de entrega**: Popup XL con MapaComponent
2. **Ver foto del pedido**: Popup XL con imagen grande
3. **Confirmar acción**: Popup SM con botones
4. **Formulario de edición**: Popup MD/LG
5. **Detalles completos**: Popup XL o FULL
