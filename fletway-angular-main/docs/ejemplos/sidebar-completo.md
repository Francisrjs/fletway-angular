# Ejemplo Completo: Uso del Sidebar

## ✅ Patrón Recomendado: Un Solo Sidebar en el Template

Sí, tu intuición es **CORRECTA**. Solo necesitas **un componente sidebar** en el template que reutilizas cambiando dinámicamente el contenido.

## 📝 Ejemplo Completo con Presupuestos

### 1. Componente de Presupuestos (PresupuestosComponent)

```typescript
// presupuestos/presupuestos.component.ts
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";

interface Presupuesto {
  id: number;
  transportista: {
    nombre: string;
    apellido: string;
    calificacion: number;
  };
  precio: number;
  comentario: string;
}

@Component({
  selector: "app-presupuestos",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <div *ngFor="let presupuesto of presupuestos" class="p-4 bg-white rounded-lg border hover:border-orange-500 cursor-pointer transition-all" (click)="seleccionar(presupuesto)">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-semibold text-gray-900">{{ presupuesto.transportista.nombre }} {{ presupuesto.transportista.apellido }}</h3>
            <div class="flex items-center gap-1 mt-1">
              <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span class="text-sm text-gray-600">{{ presupuesto.transportista.calificacion }}</span>
            </div>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-orange-600">\${{ presupuesto.precio }}</p>
          </div>
        </div>
        <p class="text-sm text-gray-600">{{ presupuesto.comentario }}</p>
      </div>

      <div *ngIf="presupuestos.length === 0" class="text-center py-8">
        <p class="text-gray-400">No hay presupuestos disponibles</p>
      </div>
    </div>
  `,
})
export class PresupuestosComponent {
  @Input() solicitudId!: number;
  @Input() presupuestos: Presupuesto[] = [];

  // Este es el output que vas a capturar
  @Output() presupuestoSeleccionado = new EventEmitter<Presupuesto>();

  ngOnInit(): void {
    console.log("Cargando presupuestos para solicitud:", this.solicitudId);
    // Aquí cargarías los presupuestos desde el servicio
  }

  seleccionar(presupuesto: Presupuesto): void {
    console.log("Presupuesto seleccionado:", presupuesto);
    this.presupuestoSeleccionado.emit(presupuesto);
  }
}
```

### 2. Componente Padre (ClienteComponent)

```typescript
// cliente-component.ts
import { Component, Type } from "@angular/core";
import { SidebarComponent } from "@shared/features/sidebar";
import { PresupuestosComponent } from "./presupuestos/presupuestos.component";
import { Solicitud } from "@core/layouts/solicitud";

@Component({
  selector: "app-cliente",
  standalone: true,
  imports: [SidebarComponent, SolicitudesListComponent],
  template: `
    <!-- Lista de Solicitudes -->
    <app-solicitudes-list [solicitudes]="solicitudes" (verPresupuestos)="abrirPresupuestos($event)"></app-solicitudes-list>

    <!-- UN SOLO SIDEBAR que se reutiliza -->
    <app-sidebar [(isOpen)]="sidebarVisible" [title]="sidebarTitle" [customComponent]="componentToLoad" [componentInputs]="sidebarInputs" position="right" width="lg" (componentOutputs)="handleSidebarOutputs($event)"></app-sidebar>
  `,
})
export class ClienteComponent {
  solicitudes: Solicitud[] = [];

  // Estado del sidebar (un solo sidebar para todo)
  sidebarVisible = false;
  sidebarTitle = "";
  componentToLoad: Type<any> | null = null;
  sidebarInputs: any = {};

  // Abrir presupuestos en el sidebar
  abrirPresupuestos(solicitud: Solicitud): void {
    this.sidebarTitle = "Presupuestos Recibidos";
    this.componentToLoad = PresupuestosComponent;
    this.sidebarInputs = {
      solicitudId: solicitud.solicitud_id,
      presupuestos: this.obtenerPresupuestos(solicitud.solicitud_id),
    };
    this.sidebarVisible = true;
  }

  // Manejar TODOS los outputs del componente dinámico
  handleSidebarOutputs(evento: { event: string; data: any }): void {
    console.log("Evento recibido del sidebar:", evento);

    // El nombre del evento es el nombre del @Output() del componente
    switch (evento.event) {
      case "presupuestoSeleccionado":
        this.aceptarPresupuesto(evento.data);
        this.sidebarVisible = false; // Cerrar después de seleccionar
        break;

      // Otros eventos...
      default:
        console.warn("Evento no manejado:", evento.event);
    }
  }

  aceptarPresupuesto(presupuesto: any): void {
    console.log("Aceptando presupuesto:", presupuesto);
    this.presupuestoService.aceptar(presupuesto.id).then(() => {
      // Recargar solicitudes
      this.cargarSolicitudes();
    });
  }

  obtenerPresupuestos(solicitudId: number): any[] {
    // Aquí obtendrías los presupuestos desde el servicio
    return [
      {
        id: 1,
        transportista: { nombre: "Juan", apellido: "Pérez", calificacion: 4.5 },
        precio: 15000,
        comentario: "Disponible hoy mismo",
      },
      {
        id: 2,
        transportista: { nombre: "María", apellido: "González", calificacion: 4.8 },
        precio: 12000,
        comentario: "Tengo camioneta grande",
      },
    ];
  }
}
```

## 🎯 Cómo Funciona el Flujo de Outputs

### Paso 1: Componente Dinámico Define Outputs

```typescript
// En PresupuestosComponent
@Output() presupuestoSeleccionado = new EventEmitter<Presupuesto>();
```

### Paso 2: Sidebar Captura Automáticamente los Outputs

El `SidebarComponent` escanea automáticamente todos los `@Output()` del componente dinámico y los suscribe.

### Paso 3: Sidebar Emite en `componentOutputs`

```typescript
// Dentro de sidebar.component.ts
Object.keys(instance).forEach((key) => {
  const value = instance[key];
  if (value instanceof EventEmitter) {
    value.subscribe((data: any) => {
      this.componentOutputs.emit({
        event: key, // Nombre del @Output (ej: 'presupuestoSeleccionado')
        data: data, // Datos emitidos
      });
    });
  }
});
```

### Paso 4: Componente Padre Maneja el Evento

```typescript
handleSidebarOutputs(evento: { event: string; data: any }): void {
  if (evento.event === 'presupuestoSeleccionado') {
    // evento.data contiene el presupuesto completo
    this.aceptarPresupuesto(evento.data);
  }
}
```

## 💡 Ventajas de Este Patrón

### ✅ Un Solo Sidebar en el Template

No necesitas múltiples `<app-sidebar>` en tu HTML. Reutilizas el mismo cambiando dinámicamente el contenido.

### ✅ Two-Way Binding

```typescript
[isOpen] = "sidebarVisible";
```

Esto hace que cuando el sidebar se cierra (por X o backdrop), `sidebarVisible` se actualiza automáticamente a `false`.

### ✅ Componentes Independientes

Cada componente dinámico (PresupuestosComponent, PedidoFormComponent, etc.) es independiente y reutilizable.

### ✅ Type-Safe

Puedes tipar los inputs y outputs correctamente.

## 🔄 Ejemplo con Múltiples Casos de Uso

```typescript
export class ClienteComponent {
  sidebarVisible = false;
  sidebarTitle = "";
  componentToLoad: Type<any> | null = null;
  sidebarInputs: any = {};

  // Caso 1: Ver presupuestos
  abrirPresupuestos(solicitud: Solicitud): void {
    this.sidebarTitle = "Presupuestos";
    this.componentToLoad = PresupuestosComponent;
    this.sidebarInputs = { solicitudId: solicitud.solicitud_id };
    this.sidebarVisible = true;
  }

  // Caso 2: Editar pedido
  editarPedido(solicitud: Solicitud): void {
    this.sidebarTitle = "Editar Pedido";
    this.componentToLoad = PedidoFormComponent;
    this.sidebarInputs = {
      solicitud: solicitud,
      modo: "editar",
    };
    this.sidebarVisible = true;
  }

  // Caso 3: Nuevo pedido
  nuevoPedido(): void {
    this.sidebarTitle = "Nuevo Pedido";
    this.componentToLoad = PedidoFormComponent;
    this.sidebarInputs = { modo: "crear" };
    this.sidebarVisible = true;
  }

  // Manejar TODOS los eventos de TODOS los componentes
  handleSidebarOutputs(evento: { event: string; data: any }): void {
    switch (evento.event) {
      case "presupuestoSeleccionado":
        this.aceptarPresupuesto(evento.data);
        break;

      case "pedidoGuardado":
        this.recargarSolicitudes();
        this.sidebarVisible = false;
        break;

      case "pedidoCancelado":
        this.sidebarVisible = false;
        break;
    }
  }
}
```

## ⚠️ Respuestas a tus Preguntas

### ¿El componente siempre queda en uso?

**No**. Cuando `[(isOpen)]="sidebarVisible"` es `false`, el sidebar NO se renderiza (gracias al `*ngIf="isOpen"` en el template). No consume recursos.

### ¿Es lo mismo para Popup?

**Sí, exactamente el mismo patrón**:

```typescript
<app-popup
  [(isOpen)]="popupVisible"
  [title]="popupTitle"
  [customComponent]="popupComponent"
  [componentInputs]="popupInputs"
  (componentOutputs)="handlePopupOutputs($event)"
></app-popup>
```

### ¿Necesito múltiples sidebars?

**No**. Un solo sidebar que cambias dinámicamente es suficiente para el 99% de los casos.

## 🎨 Alternativa: Sidebar Separados (No Recomendado)

```typescript
// ❌ Innecesariamente complejo
<app-sidebar [(isOpen)]="presupuestosSidebarVisible" ...></app-sidebar>
<app-sidebar [(isOpen)]="editarSidebarVisible" ...></app-sidebar>
<app-sidebar [(isOpen)]="nuevoSidebarVisible" ...></app-sidebar>

// ✅ Mejor: Un solo sidebar dinámico
<app-sidebar
  [(isOpen)]="sidebarVisible"
  [customComponent]="componentToLoad"
  ...
></app-sidebar>
```

## 📦 Resumen del Patrón

1. **Un solo sidebar/popup** en el template
2. **Cambias dinámicamente** el `customComponent` y `componentInputs`
3. **Capturas outputs** en `(componentOutputs)`
4. **Two-way binding** con `[(isOpen)]` para estado automático
5. El componente **NO consume recursos** cuando está cerrado

¡Este es el patrón estándar para modales/sidebars dinámicos en Angular!
