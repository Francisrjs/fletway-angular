# SidebarComponent

Componente reutilizable para mostrar contenido en un panel lateral deslizante con soporte para componentes dinámicos.

## 📍 Ubicación

```
src/app/shared/features/sidebar/
```

## 🎯 Propósito

Proporcionar un panel lateral (drawer) flexible que puede mostrar tanto contenido proyectado como componentes dinámicos. Ideal para presupuestos, detalles, configuraciones, etc.

## 📥 Inputs

| Input             | Tipo                           | Default     | Descripción                           |
| ----------------- | ------------------------------ | ----------- | ------------------------------------- |
| `isOpen`          | `boolean`                      | `false`     | Controla visibilidad del sidebar      |
| `title`           | `string`                       | `''`        | Título del sidebar                    |
| `position`        | `'left' \| 'right'`            | `'right'`   | Posición del sidebar                  |
| `width`           | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'lg'`      | Ancho del sidebar                     |
| `showCloseButton` | `boolean`                      | `true`      | Muestra/oculta botón de cerrar        |
| `closeOnBackdrop` | `boolean`                      | `true`      | Permite cerrar al clickear fondo      |
| `customComponent` | `Type<any>`                    | `undefined` | Componente a renderizar dinámicamente |
| `componentInputs` | `{ [key: string]: any }`       | `undefined` | Inputs para el componente dinámico    |

## 📤 Outputs

| Output             | Tipo                                         | Descripción                           |
| ------------------ | -------------------------------------------- | ------------------------------------- |
| `close`            | `EventEmitter<void>`                         | Emite cuando se cierra el sidebar     |
| `componentOutputs` | `EventEmitter<{ event: string; data: any }>` | Emite eventos del componente dinámico |

## 📏 Anchos Disponibles

| Width | Pixels  | Uso Recomendado                          |
| ----- | ------- | ---------------------------------------- |
| `sm`  | `320px` | Notificaciones, menú simple              |
| `md`  | `384px` | Filtros, opciones                        |
| `lg`  | `512px` | Presupuestos, detalles                   |
| `xl`  | `640px` | Contenido extenso, formularios complejos |

## 💻 Ejemplo 1: Contenido Proyectado

```typescript
import { Component } from "@angular/core";
import { SidebarComponent } from "@shared/features/sidebar";

@Component({
  selector: "app-mi-componente",
  standalone: true,
  imports: [SidebarComponent],
  template: `
    <button (click)="abrirSidebar()">Ver Filtros</button>

    <app-sidebar [isOpen]="sidebarAbierto" title="Filtros de Búsqueda" position="left" width="md" (close)="cerrarSidebar()">
      <div class="space-y-4">
        <div>
          <label>Estado</label>
          <select class="w-full p-2 border rounded">
            <option>Todos</option>
            <option>Pendiente</option>
            <option>En viaje</option>
          </select>
        </div>
        <button (click)="aplicarFiltros()" class="w-full px-4 py-2 bg-orange-500 text-white rounded-lg">Aplicar Filtros</button>
      </div>
    </app-sidebar>
  `,
})
export class MiComponente {
  sidebarAbierto = false;

  abrirSidebar(): void {
    this.sidebarAbierto = true;
  }

  cerrarSidebar(): void {
    this.sidebarAbierto = false;
  }

  aplicarFiltros(): void {
    // Lógica de filtros
    this.cerrarSidebar();
  }
}
```

## 💻 Ejemplo 2: Componente Dinámico (Presupuestos)

### Componente de Presupuestos

```typescript
import { Component, Input, Output, EventEmitter } from "@angular/core";

interface Presupuesto {
  id: number;
  transportista: string;
  precio: number;
  comentario: string;
}

@Component({
  selector: "app-presupuestos-list",
  standalone: true,
  template: `
    <div class="space-y-4">
      <div *ngFor="let presupuesto of presupuestos" class="p-4 bg-white rounded-lg border hover:border-orange-500 cursor-pointer" (click)="seleccionar(presupuesto)">
        <h3 class="font-semibold">{{ presupuesto.transportista }}</h3>
        <p class="text-2xl text-orange-600">\${{ presupuesto.precio }}</p>
        <p class="text-sm text-gray-600">{{ presupuesto.comentario }}</p>
      </div>
    </div>
  `,
})
export class PresupuestosListComponent {
  @Input() presupuestos: Presupuesto[] = [];
  @Output() presupuestoSeleccionado = new EventEmitter<Presupuesto>();

  seleccionar(presupuesto: Presupuesto): void {
    this.presupuestoSeleccionado.emit(presupuesto);
  }
}
```

### Componente Padre

```typescript
import { Component } from "@angular/core";
import { SidebarComponent } from "@shared/features/sidebar";
import { PresupuestosListComponent } from "./presupuestos-list.component";

@Component({
  selector: "app-solicitudes",
  standalone: true,
  imports: [SidebarComponent],
  template: `
    <button (click)="verPresupuestos(solicitudId)">Ver Presupuestos</button>

    <app-sidebar [isOpen]="presupuestosSidebarAbierto" title="Presupuestos Recibidos" position="right" width="lg" [customComponent]="presupuestosComponent" [componentInputs]="presupuestosInputs" (close)="cerrarPresupuestosSidebar()" (componentOutputs)="manejarSeleccion($event)"></app-sidebar>
  `,
})
export class SolicitudesComponent {
  presupuestosSidebarAbierto = false;
  presupuestosComponent = PresupuestosListComponent;
  presupuestosInputs: any = {};
  solicitudId = 123;

  verPresupuestos(solicitudId: number): void {
    // Cargar presupuestos del servicio
    this.presupuestoService.getPresupuestos(solicitudId).then((data) => {
      this.presupuestosInputs = { presupuestos: data };
      this.presupuestosSidebarAbierto = true;
    });
  }

  cerrarPresupuestosSidebar(): void {
    this.presupuestosSidebarAbierto = false;
  }

  manejarSeleccion(evento: { event: string; data: any }): void {
    if (evento.event === "presupuestoSeleccionado") {
      console.log("Presupuesto seleccionado:", evento.data);
      this.aceptarPresupuesto(evento.data);
      this.cerrarPresupuestosSidebar();
    }
  }

  aceptarPresupuesto(presupuesto: any): void {
    this.presupuestoService.aceptar(presupuesto.id);
  }
}
```

## 💻 Ejemplo 3: Detalles de Pedido

```typescript
import { Component } from "@angular/core";
import { SidebarComponent } from "@shared/features/sidebar";
import { Solicitud } from "@core/layouts/solicitud";

@Component({
  selector: "app-pedidos",
  standalone: true,
  imports: [SidebarComponent, CommonModule],
  template: `
    <div *ngFor="let pedido of pedidos" (click)="verDetalles(pedido)">
      {{ pedido.detalles_carga }}
    </div>

    <app-sidebar [isOpen]="detallesSidebarAbierto" [title]="'Detalles: ' + pedidoSeleccionado?.detalles_carga" position="right" width="xl" (close)="cerrarDetalles()">
      <div *ngIf="pedidoSeleccionado" class="space-y-6">
        <section>
          <h3 class="font-semibold mb-2">Información General</h3>
          <p><strong>ID:</strong> {{ pedidoSeleccionado.solicitud_id }}</p>
          <p><strong>Estado:</strong> {{ pedidoSeleccionado.estado }}</p>
          <p><strong>Fecha:</strong> {{ pedidoSeleccionado.fecha_creacion | date }}</p>
        </section>

        <section>
          <h3 class="font-semibold mb-2">Ubicaciones</h3>
          <p><strong>Origen:</strong> {{ pedidoSeleccionado.direccion_origen }}</p>
          <p><strong>Destino:</strong> {{ pedidoSeleccionado.direccion_destino }}</p>
        </section>

        <img *ngIf="pedidoSeleccionado.foto" [src]="pedidoSeleccionado.foto" class="w-full rounded-lg" />
      </div>
    </app-sidebar>
  `,
})
export class PedidosComponent {
  detallesSidebarAbierto = false;
  pedidoSeleccionado: Solicitud | null = null;
  pedidos: Solicitud[] = [];

  verDetalles(pedido: Solicitud): void {
    this.pedidoSeleccionado = pedido;
    this.detallesSidebarAbierto = true;
  }

  cerrarDetalles(): void {
    this.detallesSidebarAbierto = false;
  }
}
```

## 🎨 Características

### Animaciones

- **Backdrop**: Fade in (0.2s)
- **Sidebar**: Slide in desde el lado correspondiente (0.3s)
- Animaciones fluidas y profesionales

### Posiciones

- **Left**: Desliza desde la izquierda
- **Right**: Desliza desde la derecha (default)

### Header

- Fondo con gradiente naranja sutil
- Título prominente
- Botón de cerrar con sombra

### Contenido

- Scroll automático si excede altura
- Fondo gris claro (bg-gray-50)
- Padding generoso

### Backdrop

- Fondo negro con opacidad 50%
- Efecto blur sutil
- Clickeable para cerrar (configurable)

## 🔧 Métodos Públicos

| Método                   | Descripción                                      |
| ------------------------ | ------------------------------------------------ |
| `onClose()`              | Cierra el sidebar y destruye componente dinámico |
| `stopPropagation(event)` | Previene cierre al clickear contenido            |

## 📊 Getters

| Getter            | Retorno  | Descripción                       |
| ----------------- | -------- | --------------------------------- |
| `widthClasses`    | `string` | Clases CSS según ancho            |
| `positionClasses` | `string` | Clases CSS según posición         |
| `slideAnimation`  | `string` | Clase de animación según posición |

## 📱 Responsividad

- Mobile-friendly
- Altura completa en todos los dispositivos
- Scroll interno cuando es necesario
- Anchos adaptativos

## ⚠️ Notas Importantes

1. **Componentes dinámicos**: Deben ser standalone
2. **Outputs automáticos**: Se capturan todos los EventEmitter
3. **Destrucción**: El componente se destruye al cerrar
4. **Z-index**: `z-50` para superponerse
5. **Overlay**: No apila múltiples sidebars (manejar con lógica padre)

## 🎨 Personalización de Estilos

El sidebar usa Tailwind CSS. Puedes personalizar:

```typescript
// Ejemplo de sidebar con estilos custom
<app-sidebar
  [isOpen]="true"
  class="custom-sidebar"
>
  <!-- contenido -->
</app-sidebar>
```

```css
/* En tu archivo de estilos */
.custom-sidebar ::ng-deep .sidebar-header {
  background: linear-gradient(to right, #667eea, #764ba2);
}
```

## 🔗 Dependencias

```typescript
import { CommonModule } from "@angular/common";
```

## 📦 Export

```typescript
export { SidebarComponent };
```

## 🚀 Casos de Uso Recomendados

1. **Presupuestos**: Sidebar derecho, width LG
2. **Filtros**: Sidebar izquierdo, width MD
3. **Detalles de pedido**: Sidebar derecho, width XL
4. **Configuración**: Sidebar derecho, width MD
5. **Chat/Mensajes**: Sidebar derecho, width LG
6. **Historial**: Sidebar izquierdo, width LG

## 🔄 Comparación con Popup

| Característica | Sidebar          | Popup                       |
| -------------- | ---------------- | --------------------------- |
| Posición       | Lateral          | Centrado                    |
| Animación      | Slide            | Scale + Fade                |
| Altura         | Full height      | Max 90vh                    |
| Uso ideal      | Listas, detalles | Confirmaciones, formularios |
| Espacio        | Ocupa lateral    | Ocupa centro                |
