# Skeleton Loading en Popup y Sidebar

## 🎯 Propósito

Mostrar un estado de carga elegante mientras se obtienen datos para el componente dinámico, mejorando la percepción de velocidad de la aplicación.

## ✨ Implementación

### Opción 1: Prop `loading` (Recomendado)

El sidebar y popup tienen un prop `loading` que automáticamente muestra un skeleton loader.

```typescript
export class ClienteComponent {
  sidebarVisible = false;
  sidebarLoading = false; // ← Nuevo estado
  sidebarTitle = "";
  componentToLoad: Type<any> | null = null;
  sidebarInputs: any = {};

  async abrirPresupuestos(solicitud: Solicitud): Promise<void> {
    // 1. Abrir sidebar vacío con loading
    this.sidebarTitle = "Presupuestos Recibidos";
    this.sidebarLoading = true; // ← Activa skeleton
    this.sidebarVisible = true;

    try {
      // 2. Cargar datos (esto puede tardar)
      const presupuestos = await this.presupuestoService.getPresupuestos(solicitud.solicitud_id);

      // 3. Configurar componente con datos
      this.componentToLoad = PresupuestosComponent;
      this.sidebarInputs = {
        solicitudId: solicitud.solicitud_id,
        presupuestos: presupuestos,
      };
    } catch (error) {
      console.error("Error cargando presupuestos:", error);
      this.sidebarVisible = false;
    } finally {
      // 4. Ocultar skeleton
      this.sidebarLoading = false;
    }
  }
}
```

```html
<!-- Template -->
<app-sidebar [(isOpen)]="sidebarVisible" [loading]="sidebarLoading" [title]="sidebarTitle" [customComponent]="componentToLoad" [componentInputs]="sidebarInputs" (componentOutputs)="handleSidebarOutputs($event)"></app-sidebar>
```

## 🎬 Flujo de Carga con Skeleton

### Paso 1: Abrir con Loading

```typescript
abrirPresupuestos(solicitud: Solicitud): void {
  this.sidebarTitle = 'Presupuestos';
  this.sidebarLoading = true;  // ← Muestra skeleton
  this.sidebarVisible = true;  // ← Abre sidebar

  // Cargar datos asíncronamente
  this.cargarDatos(solicitud);
}
```

### Paso 2: Cargar Datos

```typescript
async cargarDatos(solicitud: Solicitud): Promise<void> {
  try {
    // Simular carga de API
    const presupuestos = await this.presupuestoService.getPresupuestos(
      solicitud.solicitud_id
    );

    // Configurar componente
    this.componentToLoad = PresupuestosComponent;
    this.sidebarInputs = {
      solicitudId: solicitud.solicitud_id,
      presupuestos
    };
  } finally {
    this.sidebarLoading = false; // ← Oculta skeleton y muestra contenido
  }
}
```

## 💻 Ejemplo Completo: Presupuestos con Loading

```typescript
import { Component, Type } from "@angular/core";
import { SidebarComponent } from "@shared/features/sidebar";
import { PresupuestosComponent } from "./presupuestos.component";
import { PresupuestoService } from "@core/services/presupuesto.service";

@Component({
  selector: "app-cliente",
  standalone: true,
  imports: [SidebarComponent],
  template: `
    <button (click)="verPresupuestos(solicitud)">Ver Presupuestos</button>

    <app-sidebar [(isOpen)]="sidebarVisible" [loading]="sidebarLoading" [title]="sidebarTitle" [customComponent]="componentToLoad" [componentInputs]="sidebarInputs" position="right" width="lg" (componentOutputs)="handleSidebarOutputs($event)"></app-sidebar>
  `,
})
export class ClienteComponent {
  sidebarVisible = false;
  sidebarLoading = false;
  sidebarTitle = "";
  componentToLoad: Type<any> | null = null;
  sidebarInputs: any = {};

  constructor(private presupuestoService: PresupuestoService) {}

  verPresupuestos(solicitud: Solicitud): void {
    // Abrir inmediatamente con skeleton
    this.sidebarTitle = "Presupuestos Recibidos";
    this.sidebarLoading = true;
    this.sidebarVisible = true;

    // Cargar datos
    this.presupuestoService
      .getPresupuestos(solicitud.solicitud_id)
      .then((presupuestos) => {
        this.componentToLoad = PresupuestosComponent;
        this.sidebarInputs = {
          solicitudId: solicitud.solicitud_id,
          presupuestos: presupuestos,
        };
        this.sidebarLoading = false; // ← Skeleton desaparece
      })
      .catch((error) => {
        console.error("Error:", error);
        this.sidebarVisible = false;
        this.sidebarLoading = false;
      });
  }

  handleSidebarOutputs(evento: { event: string; data: any }): void {
    if (evento.event === "presupuestoSeleccionado") {
      this.aceptarPresupuesto(evento.data);
      this.sidebarVisible = false;
    }
  }

  aceptarPresupuesto(presupuesto: any): void {
    console.log("Aceptando:", presupuesto);
  }
}
```

## 🎨 Ejemplo con Popup

```typescript
export class MapaComponent {
  popupVisible = false;
  popupLoading = false;
  popupComponent: Type<any> | null = null;
  popupInputs: any = {};

  verMapa(solicitud: Solicitud): void {
    // Abrir popup con loading
    this.popupLoading = true;
    this.popupVisible = true;

    // Simular carga de mapa
    this.mapaService.cargarMapa(solicitud).then((datosMapa) => {
      this.popupComponent = MapaDetalleComponent;
      this.popupInputs = { datosMapa };
      this.popupLoading = false; // Skeleton desaparece
    });
  }
}
```

```html
<app-popup [(isOpen)]="popupVisible" [loading]="popupLoading" title="Mapa de Ruta" size="xl" [customComponent]="popupComponent" [componentInputs]="popupInputs"></app-popup>
```

## ⚡ Opción 2: Loading Interno del Componente

El componente dinámico puede manejar su propio estado de carga:

```typescript
@Component({
  selector: "app-presupuestos",
  template: `
    <!-- Skeleton interno -->
    <app-skeleton-loader *ngIf="loading" [count]="3"></app-skeleton-loader>

    <!-- Contenido real -->
    <div *ngIf="!loading">
      <div *ngFor="let p of presupuestos">{{ p.transportista }} - \${{ p.precio }}</div>
    </div>
  `,
})
export class PresupuestosComponent implements OnInit {
  @Input() solicitudId!: number;
  presupuestos: Presupuesto[] = [];
  loading = true;

  async ngOnInit(): Promise<void> {
    this.loading = true;
    this.presupuestos = await this.service.getPresupuestos(this.solicitudId);
    this.loading = false;
  }
}
```

## 🎯 Cuándo Usar Cada Opción

### Prop `loading` del Sidebar/Popup (Opción 1)

**Usa cuando**:

- Los datos se cargan ANTES de abrir el sidebar/popup
- Quieres control total desde el componente padre
- El componente dinámico es simple y no tiene lógica de carga

### Loading Interno del Componente (Opción 2)

**Usa cuando**:

- El componente dinámico es complejo y autónomo
- Los datos se cargan DENTRO del componente (ngOnInit)
- Quieres reutilizar el componente en múltiples contextos

### Combinación (Mejor UX)

```typescript
// 1. Abrir con skeleton del sidebar
this.sidebarLoading = true;
this.sidebarVisible = true;

// 2. Cargar datos básicos
const datos = await this.service.getDatosRapidos();

// 3. Configurar componente (sidebar skeleton desaparece)
this.componentToLoad = MiComponente;
this.sidebarInputs = { datos };
this.sidebarLoading = false;

// 4. El componente puede seguir cargando datos internamente
// con su propio skeleton si lo necesita
```

## 🎨 Personalizar Skeleton

```typescript
<app-skeleton-loader
  [count]="5"           // Número de items
  [showHeader]="true"   // Mostrar header skeleton
  [showFooter]="true"   // Mostrar footer skeleton
  [showAvatar]="true"   // Mostrar avatars
></app-skeleton-loader>
```

## 📊 Comparación de UX

### ❌ Sin Skeleton

```
Usuario clickea → [nada] → [nada] → [nada] → ¡Aparece contenido!
Percepción: ¿Se rompió? ¿Debo volver a clickear?
```

### ✅ Con Skeleton

```
Usuario clickea → Sidebar abre + skeleton → Contenido aparece
Percepción: ¡La app es rápida y está funcionando!
```

## ⚠️ Mejores Prácticas

1. **Siempre muestra loading para operaciones >200ms**

```typescript
const inicio = Date.now();
const datos = await this.service.getDatos();
const duracion = Date.now() - inicio;

// Solo mostrar skeleton si tardó más de 200ms
if (duracion > 200) {
  this.sidebarLoading = true;
}
```

2. **Timeout de seguridad**

```typescript
const timeout = setTimeout(() => {
  this.sidebarLoading = false;
  this.mostrarError("Tiempo de espera agotado");
}, 10000); // 10 segundos máximo

try {
  await this.cargarDatos();
} finally {
  clearTimeout(timeout);
  this.sidebarLoading = false;
}
```

3. **Manejo de errores**

```typescript
try {
  this.sidebarLoading = true;
  await this.cargarDatos();
} catch (error) {
  this.mostrarError("Error al cargar");
  this.sidebarVisible = false; // Cerrar en caso de error
} finally {
  this.sidebarLoading = false;
}
```

## 🚀 Resultado

- ✅ Usuario ve feedback inmediato
- ✅ No hay pantallas en blanco
- ✅ Percepción de app más rápida
- ✅ Mejor experiencia de usuario
- ✅ Reduce ansiedad del usuario mientras espera
