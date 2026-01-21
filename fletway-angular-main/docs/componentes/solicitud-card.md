# SolicitudCardComponent

Card individual minimalista y futurista para mostrar información de una solicitud de flete.

## 📍 Ubicación

```
src/app/shared/features/solicitudes/solicitud-card/
```

## 🎯 Propósito

Mostrar de forma atractiva y funcional toda la información relevante de una solicitud de flete.

## 📥 Inputs

| Input            | Tipo        | Default     | Descripción                      |
| ---------------- | ----------- | ----------- | -------------------------------- |
| `solicitud`      | `Solicitud` | _requerido_ | Objeto de solicitud a mostrar    |
| `mostrarBotones` | `boolean`   | `true`      | Muestra/oculta botones de acción |

## 📤 Outputs

| Output            | Tipo                      | Descripción                                |
| ----------------- | ------------------------- | ------------------------------------------ |
| `verMapa`         | `EventEmitter<Solicitud>` | Emite cuando se clickea "Ver en el mapa"   |
| `verPresupuestos` | `EventEmitter<Solicitud>` | Emite cuando se clickea "Ver presupuestos" |
| `cancelarPedido`  | `EventEmitter<Solicitud>` | Emite cuando se clickea "Cancelar pedido"  |
| `calificar`       | `EventEmitter<Solicitud>` | Emite cuando se clickea "Calificar"        |
| `verFoto`         | `EventEmitter<Solicitud>` | Emite cuando se clickea la foto            |

## 🎨 Diseño y Características

### Tag de Estado (Superior Izquierda)

- **Completado**: Verde (`bg-green-500/10`)
- **En viaje**: Amarillo (`bg-yellow-500/10`)
- **Sin transportista**: Rojo (`bg-red-500/10`)
- **Pendiente**: Azul (`bg-blue-500/10`)

### Tag de Transportista Notificado

- Se muestra **debajo de la foto**
- Solo visible cuando estado = "pendiente"
- Estilo: Fondo amarillo con icono de correo

### Sección de Foto

- **Con foto**: Imagen responsive (h-48) con hover effect (scale-105)
- **Sin foto**: Placeholder con icono y mensaje
- Click abre modal/popup de visualización

### Información del Transportista

- **Asignado**: Avatar, nombre y calificación promedio
- **Buscando**: Placeholder con mensaje informativo

### Botones de Acción

#### Botón "Ver en el mapa"

- Color: Blanco con borde gris
- Hover: Borde naranja
- Icono: Pin de ubicación

#### Botón "Ver presupuestos"

- **Verde** si presupuesto está aceptado
- **Azul** si hay presupuestos pendientes
- **Azul claro** si no hay presupuestos
- Texto dinámico según estado

#### Botón "Calificar servicio"

- Solo visible si estado = "completado" y sin calificación
- Color: Amarillo
- Icono: Estrella

#### Botón "Cancelar pedido"

- Color: Rojo claro
- Hover: Rojo más intenso
- Icono: X

## 💻 Ejemplo de Uso

```typescript
import { Component } from "@angular/core";
import { SolicitudCardComponent } from "@shared/features/solicitudes";
import { Solicitud } from "@core/layouts/solicitud";

@Component({
  selector: "app-mi-componente",
  standalone: true,
  imports: [SolicitudCardComponent],
  template: ` <app-solicitud-card [solicitud]="miSolicitud" [mostrarBotones]="true" (verMapa)="abrirMapa($event)" (verPresupuestos)="abrirPresupuestos($event)" (cancelarPedido)="cancelar($event)" (calificar)="calificar($event)" (verFoto)="verFotoGrande($event)"></app-solicitud-card> `,
})
export class MiComponente {
  miSolicitud: Solicitud = {
    solicitud_id: 123,
    detalles_carga: "Mudanza de muebles",
    direccion_origen: "Av. Principal 123",
    direccion_destino: "Calle Secundaria 456",
    estado: "pendiente",
    fecha_creacion: "2026-01-20T10:00:00Z",
    foto: "https://example.com/foto.jpg",
    // ... otros campos
  };

  abrirMapa(solicitud: Solicitud): void {
    // Abrir componente de mapa en popup
    this.popupService.open(MapaComponent, {
      solicitud: solicitud,
    });
  }

  abrirPresupuestos(solicitud: Solicitud): void {
    // Abrir presupuestos en sidebar
    this.sidebarService.open(PresupuestosComponent, {
      solicitudId: solicitud.solicitud_id,
    });
  }

  cancelar(solicitud: Solicitud): void {
    if (confirm("¿Seguro que deseas cancelar?")) {
      this.solicitudService.cancelar(solicitud.solicitud_id);
    }
  }

  calificar(solicitud: Solicitud): void {
    this.modalService.open(CalificacionComponent, { solicitud });
  }

  verFotoGrande(solicitud: Solicitud): void {
    this.modalService.openImage(solicitud.foto);
  }
}
```

## 📊 Getters Computados

### `badgeClass: string`

Retorna las clases CSS para el badge de estado.

### `tieneFoto(): boolean`

Indica si la solicitud tiene foto válida.

### `estadoTransportista: 'asignado' | 'buscando'`

Estado del transportista basado en `_hayAceptado`.

### `totalPresupuestos: number`

Total de presupuestos disponibles.

### `transportista: any`

Datos del transportista asignado.

### `calificacionPromedio: number | null`

Calificación promedio del transportista.

### `puedeCalificar: boolean`

Indica si se puede mostrar el botón de calificar.

## 🎨 Efectos Visuales

- **Hover en card**: Sombra más intensa y borde naranja
- **Hover en foto**: Scale 105%
- **Transiciones**: 300ms ease-out
- **Bordes**: Sutiles con opacidad (border-gray-200/50)
- **Sombras**: Leves (shadow-sm) que aumentan en hover (shadow-lg)

## 📱 Responsividad

- Diseño adaptable a todos los tamaños
- Imágenes responsive con `object-cover`
- Texto truncado donde corresponde
- Compatible con Ionic/móvil

## ⚠️ Consideraciones

1. **Campo `_hayAceptado`**: Debe ser agregado dinámicamente al objeto Solicitud
2. **Campo `_totalMostrables`**: Total de presupuestos disponibles
3. **URLs de fotos**: Deben estar completas (no relativas)
4. **Estados**: Usar exactamente: "pendiente", "sin transportista", "en viaje", "completado"

## 🔗 Interfaz Solicitud Requerida

```typescript
interface Solicitud {
  solicitud_id: number;
  detalles_carga?: string | null;
  direccion_origen?: string | null;
  direccion_destino?: string | null;
  fecha_creacion?: string | null;
  estado?: string | null;
  foto?: string | null;
  localidad_origen?: { nombre: string };
  localidad_destino?: { nombre: string };

  // Campos dinámicos
  _hayAceptado?: boolean;
  _totalMostrables?: number;
  presupuesto?: {
    transportista: {
      usuario: {
        nombre: string;
        apellido: string;
      };
      cantidad_calificaciones: number;
      total_calificaciones: number;
    };
  };
}
```

## 🎨 Paleta de Colores

- **Naranja principal**: `#FF6F00` (hover, focus)
- **Verde**: Estados completados y presupuesto aceptado
- **Amarillo**: En viaje y notificaciones
- **Azul**: Pendiente
- **Rojo**: Sin transportista y cancelar
- **Gris**: Backgrounds y bordes

## 📦 Dependencies

```typescript
import { CommonModule } from "@angular/common";
```

Componente completamente standalone, sin dependencias externas.
