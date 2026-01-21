# Documentación de Componentes - Fletway Angular

Documentación completa de los componentes reutilizables de la aplicación Fletway.

## 📚 Índice de Componentes

### Solicitudes

- [**SolicitudesListComponent**](./componentes/solicitudes-list.md) - Lista completa con búsqueda, filtros y ordenamiento
- [**SolicitudCardComponent**](./componentes/solicitud-card.md) - Card individual minimalista para solicitudes
- [**SolicitudSkeletonComponent**](./componentes/solicitud-skeleton.md) - Skeleton loader para estados de carga

### UI/Overlays

- [**PopupComponent**](./componentes/popup.md) - Modal/Popup centrado reutilizable
- [**SidebarComponent**](./componentes/sidebar.md) - Panel lateral deslizante reutilizable

## 🎯 Componentes por Caso de Uso

### Ver Solicitudes

```typescript
// Lista completa con todas las funcionalidades
<app-solicitudes-list
  [solicitudes]="solicitudes"
  [loading]="loading"
  titulo="Mis Pedidos"
  (verMapa)="abrirMapaEnPopup($event)"
  (verPresupuestos)="abrirPresupuestosEnSidebar($event)"
></app-solicitudes-list>
```

### Ver Mapa en Popup

```typescript
<app-popup
  [isOpen]="mapaAbierto"
  title="Ubicación del Pedido"
  size="xl"
  [customComponent]="MapaComponent"
  [componentInputs]="{ solicitud: solicitudSeleccionada }"
  (close)="cerrarMapa()"
></app-popup>
```

### Ver Presupuestos en Sidebar

```typescript
<app-sidebar
  [isOpen]="presupuestosAbierto"
  title="Presupuestos Recibidos"
  position="right"
  width="lg"
  [customComponent]="PresupuestosComponent"
  [componentInputs]="{ solicitudId: solicitudId }"
  (close)="cerrarPresupuestos()"
  (componentOutputs)="manejarPresupuesto($event)"
></app-sidebar>
```

## 🔧 Instalación y Configuración

### 1. Importar Componentes

Los componentes son standalone, impórtalos directamente:

```typescript
import { SolicitudesListComponent } from '@shared/features/solicitudes';
import { PopupComponent } from '@shared/features/popup';
import { SidebarComponent } from '@shared/features/sidebar';

@Component({
  imports: [SolicitudesListComponent, PopupComponent, SidebarComponent],
  // ...
})
```

### 2. Configurar Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["src/app/shared/*"],
      "@core/*": ["src/app/core/*"]
    }
  }
}
```

## 📊 Estructura de Datos

### Interfaz Solicitud

```typescript
interface Solicitud {
  solicitud_id: number;
  detalles_carga?: string | null;
  direccion_origen?: string | null;
  direccion_destino?: string | null;
  fecha_creacion?: string | null;
  estado?: "pendiente" | "sin transportista" | "en viaje" | "completado";
  foto?: string | null;

  localidad_origen?: { nombre: string };
  localidad_destino?: { nombre: string };

  // Campos dinámicos agregados por el servicio
  _hayAceptado?: boolean;
  _totalMostrables?: number;

  presupuesto?: {
    transportista: {
      usuario: { nombre: string; apellido: string };
      cantidad_calificaciones: number;
      total_calificaciones: number;
    };
  };
}
```

## 🎨 Sistema de Diseño

### Paleta de Colores

- **Naranja Principal**: `#FF6F00`
- **Azul Grisáceo**: `#455A64`
- **Blanco**: `#FFFFFF`
- **Beige Claro**: `#FBE9E7`

### Estados con Colores Semánticos

- **Verde**: Completado, Aceptado
- **Amarillo**: En viaje, Notificaciones
- **Azul**: Pendiente
- **Rojo**: Sin transportista, Cancelar

### Tamaños y Espaciado

- Padding: `p-4`, `p-6`
- Gaps: `gap-2`, `gap-3`, `gap-4`
- Bordes: `rounded-lg`, `rounded-xl`
- Sombras: `shadow-sm`, `shadow-lg`

## 🚀 Flujo de Trabajo Completo

### Ejemplo: Ver Solicitudes → Abrir Mapa → Ver Presupuestos

```typescript
import { Component } from "@angular/core";
import { SolicitudesListComponent, PopupComponent, SidebarComponent } from "@shared/features";
import { Solicitud } from "@core/layouts/solicitud";
import { MapaComponent } from "./mapa.component";
import { PresupuestosComponent } from "./presupuestos.component";

@Component({
  selector: "app-mis-pedidos",
  standalone: true,
  imports: [SolicitudesListComponent, PopupComponent, SidebarComponent],
  template: `
    <!-- Lista de Solicitudes -->
    <app-solicitudes-list [solicitudes]="solicitudes" [loading]="loading" titulo="Mis Pedidos" (agregarPedido)="navegarANuevo()" (verMapa)="abrirMapa($event)" (verPresupuestos)="abrirPresupuestos($event)" (calificar)="abrirCalificacion($event)" (verFoto)="abrirFoto($event)"></app-solicitudes-list>

    <!-- Popup para Mapa -->
    <app-popup [isOpen]="mapaPopupAbierto" title="Ubicación del Pedido" size="xl" [customComponent]="mapaComponent" [componentInputs]="mapaInputs" (close)="cerrarMapa()"></app-popup>

    <!-- Sidebar para Presupuestos -->
    <app-sidebar [isOpen]="presupuestosSidebarAbierto" title="Presupuestos Recibidos" position="right" width="lg" [customComponent]="presupuestosComponent" [componentInputs]="presupuestosInputs" (close)="cerrarPresupuestos()" (componentOutputs)="manejarPresupuesto($event)"></app-sidebar>

    <!-- Popup para Ver Foto -->
    <app-popup [isOpen]="fotoPopupAbierta" title="Foto del Pedido" size="xl" (close)="cerrarFoto()">
      <img [src]="fotoUrl" class="w-full h-auto" />
    </app-popup>
  `,
})
export class MisPedidosComponent {
  solicitudes: Solicitud[] = [];
  loading = false;

  // Popup Mapa
  mapaPopupAbierto = false;
  mapaComponent = MapaComponent;
  mapaInputs: any = {};

  // Sidebar Presupuestos
  presupuestosSidebarAbierto = false;
  presupuestosComponent = PresupuestosComponent;
  presupuestosInputs: any = {};

  // Popup Foto
  fotoPopupAbierta = false;
  fotoUrl = "";

  abrirMapa(solicitud: Solicitud): void {
    this.mapaInputs = { solicitud };
    this.mapaPopupAbierto = true;
  }

  cerrarMapa(): void {
    this.mapaPopupAbierto = false;
  }

  abrirPresupuestos(solicitud: Solicitud): void {
    this.presupuestosInputs = { solicitudId: solicitud.solicitud_id };
    this.presupuestosSidebarAbierto = true;
  }

  cerrarPresupuestos(): void {
    this.presupuestosSidebarAbierto = false;
  }

  manejarPresupuesto(evento: { event: string; data: any }): void {
    if (evento.event === "presupuestoAceptado") {
      // Actualizar solicitud
      this.cargarSolicitudes();
      this.cerrarPresupuestos();
    }
  }

  abrirFoto(solicitud: Solicitud): void {
    if (solicitud.foto) {
      this.fotoUrl = solicitud.foto;
      this.fotoPopupAbierta = true;
    }
  }

  cerrarFoto(): void {
    this.fotoPopupAbierta = false;
  }

  navegarANuevo(): void {
    this.router.navigate(["/nueva-solicitud"]);
  }

  cargarSolicitudes(): void {
    this.loading = true;
    this.solicitudService.getMisSolicitudes().then((data) => {
      this.solicitudes = data;
      this.loading = false;
    });
  }
}
```

## ⚡ Mejores Prácticas

### 1. Manejo de Estados

```typescript
// ✅ Bueno - Estados claros
isOpen = false;
loading = false;

// ❌ Malo - Estados ambiguos
show = false;
```

### 2. Nombres de Eventos

```typescript
// ✅ Bueno - Verbos en infinitivo
verMapa =
  "abrirMapa($event)"(cancelarPedido) =
  "confirmarCancelacion($event)"(
    // ❌ Malo - Nombres confusos
    mapa,
  ) =
    "doMapa($event)";
```

### 3. Componentes Dinámicos

```typescript
// ✅ Bueno - Tipado fuerte
mapaComponent: Type<MapaComponent> = MapaComponent;

// ❌ Malo - any
mapaComponent: any = MapaComponent;
```

### 4. Inputs de Componentes

```typescript
// ✅ Bueno - Objeto reactivo
this.mapaInputs = { solicitud: this.solicitud };

// ❌ Malo - Asignación directa
this.mapaInputs.solicitud = this.solicitud; // No reactivo
```

## 🐛 Troubleshooting

### Las fotos no se muestran

**Problema**: Las URLs de fotos son relativas
**Solución**: Usar servicio para convertir a URL completa:

```typescript
solicitudes = solicitudes.map((s) => ({
  ...s,
  foto: this.fotoService.obtenerUrlCompleta(s.foto),
}));
```

### Popup/Sidebar no cierra

**Problema**: Event propagation
**Solución**: Usar `stopPropagation` en contenido interno

```html
<div (click)="$event.stopPropagation()">
  <!-- contenido -->
</div>
```

### Componente dinámico no recibe inputs

**Problema**: Inputs no reactivos
**Solución**: Crear nuevo objeto en cada cambio:

```typescript
// ✅ Correcto
this.componentInputs = { ...newData };

// ❌ Incorrecto
this.componentInputs.data = newData;
```

## 📞 Soporte

Para preguntas o issues:

1. Revisar esta documentación
2. Ver ejemplos en los archivos .md individuales
3. Consultar el código fuente en `src/app/shared/features/`

## 📝 Changelog

### v1.0.0 (2026-01-21)

- ✨ Componente SolicitudesListComponent con búsqueda y filtros
- ✨ Componente SolicitudCardComponent minimalista
- ✨ Componente PopupComponent reutilizable
- ✨ Componente SidebarComponent reutilizable
- 🎨 Sistema de ordenamiento automático por prioridad
- 🎨 Estados corregidos: "pendiente", "sin transportista", "en viaje", "completado"
- 🎨 Botón de presupuesto en verde cuando está aceptado
- 📱 Diseño responsivo e compatibilidad con Ionic
