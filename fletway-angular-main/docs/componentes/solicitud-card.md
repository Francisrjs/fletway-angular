# SolicitudCardComponent

Card individual minimalista y futurista para mostrar información de una solicitud de flete.

## 📍 Ubicación

```
src/app/shared/features/solicitudes/solicitud-card/
```

## 🎯 Propósito

Mostrar de forma atractiva y funcional toda la información relevante de una solicitud de flete.

## 📥 Inputs

| Input            | Tipo                       | Default     | Descripción                                                                       |
| ---------------- | -------------------------- | ----------- | --------------------------------------------------------------------------------- |
| `solicitud`      | `Solicitud`                | _requerido_ | Objeto de solicitud a mostrar                                                     |
| `mostrarBotones` | `boolean`                  | `true`      | Muestra/oculta botones de acción                                                  |
| `modo`           | `'cliente'` \| `'fletero'` | `'cliente'` | Modo de visualización: 'cliente' muestra transportista, 'fletero' muestra cliente |

## 📤 Outputs

### Eventos compartidos (ambos modos)

| Output    | Tipo                      | Descripción                              |
| --------- | ------------------------- | ---------------------------------------- |
| `verMapa` | `EventEmitter<Solicitud>` | Emite cuando se clickea "Ver en el mapa" |
| `verFoto` | `EventEmitter<Solicitud>` | Emite cuando se clickea la foto          |

### Eventos específicos para modo CLIENTE

| Output            | Tipo                      | Descripción                                |
| ----------------- | ------------------------- | ------------------------------------------ |
| `verPresupuestos` | `EventEmitter<Solicitud>` | Emite cuando se clickea "Ver presupuestos" |
| `cancelarPedido`  | `EventEmitter<Solicitud>` | Emite cuando se clickea "Cancelar pedido"  |
| `calificar`       | `EventEmitter<Solicitud>` | Emite cuando se clickea "Calificar"        |

### Eventos específicos para modo FLETERO

| Output               | Tipo                      | Descripción                                  |
| -------------------- | ------------------------- | -------------------------------------------- |
| `realizarViaje`      | `EventEmitter<Solicitud>` | Emite cuando se clickea "Realizar viaje"     |
| `completarViaje`     | `EventEmitter<Solicitud>` | Emite cuando se clickea "Viaje Completado"   |
| `realizarCotizacion` | `EventEmitter<Solicitud>` | Emite cuando se navega a realizar cotización |
| `enviarMensaje`      | `EventEmitter<Solicitud>` | Emite cuando se clickea "Enviar Mensaje"     |

## 🎨 Diseño y Características

### Modo de Visualización

El componente ahora soporta dos modos:

- **modo="cliente"**: Muestra información del transportista y botones para gestión del cliente
- **modo="fletero"**: Muestra información del cliente y botones para gestión del fletero

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
- **URL de foto**: Se obtiene automáticamente a través del servicio `SolicitudFlaskService`
- **Manejo de errores**: Si la imagen falla, se muestra imagen placeholder (boxes.png)

### Información del Transportista (Modo Cliente)

- **Asignado**: Avatar, nombre y calificación promedio
- **Buscando**: Placeholder con mensaje informativo

### Información del Cliente (Modo Fletero)

- Avatar del cliente
- Nombre completo
- Teléfono de contacto

### Botones de Acción - Modo CLIENTE

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

### Botones de Acción - Modo FLETERO

#### Botón "Ver en el mapa"

- Color: Blanco con borde gris
- Hover: Borde naranja
- Icono: Pin de ubicación

#### Botón "Realizar Cotización"

- Navegación con RouterLink a `/fletero/detalle/:id`
- Color: Blanco con borde gris
- Icono: Signo de dólar

#### Botón "Enviar Mensaje"

- Color: Naranja
- Icono: Mensaje/chat
- Emite evento para contactar al cliente

#### Botón "Realizar viaje"

- **Condición**: Solo visible si `estado === 'pendiente'`
- Color: Azul
- Icono: Camión

#### Botón "Viaje Completado"

- **Condición**: Solo visible si `estado === 'en viaje'`
- Color: Verde
- Icono: Check

## 💻 Ejemplos de Uso

### Modo Cliente

```typescript
import { Component } from "@angular/core";
import { SolicitudCardComponent } from "@shared/features/solicitudes";
import { Solicitud } from "@core/layouts/solicitud";

@Component({
  selector: "app-cliente-componente",
  standalone: true,
  imports: [SolicitudCardComponent],
  template: ` <app-solicitud-card [solicitud]="miSolicitud" [modo]="'cliente'" [mostrarBotones]="true" (verMapa)="abrirMapa($event)" (verPresupuestos)="abrirPresupuestos($event)" (cancelarPedido)="cancelar($event)" (calificar)="calificar($event)" (verFoto)="verFotoGrande($event)"></app-solicitud-card> `,
})
export class ClienteComponente {
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

### Modo Fletero

```typescript
import { Component } from "@angular/core";
import { SolicitudCardComponent } from "@shared/features/solicitudes";
import { Solicitud } from "@core/layouts/solicitud";

@Component({
  selector: "app-fletero-componente",
  standalone: true,
  imports: [SolicitudCardComponent],
  template: ` <app-solicitud-card [solicitud]="miSolicitud" [modo]="'fletero'" [mostrarBotones]="true" (verMapa)="abrirMapa($event)" (realizarViaje)="iniciarViaje($event)" (completarViaje)="finalizarViaje($event)" (enviarMensaje)="enviarMensajeCliente($event)" (verFoto)="verFotoGrande($event)"></app-solicitud-card> `,
})
export class FleteroComponente {
  miSolicitud: Solicitud = {
    solicitud_id: 123,
    detalles_carga: "Mudanza de muebles",
    direccion_origen: "Av. Principal 123",
    direccion_destino: "Calle Secundaria 456",
    estado: "pendiente",
    fecha_creacion: "2026-01-20T10:00:00Z",
    foto: "foto_carga_123.jpg",
    cliente: {
      nombre: "Juan",
      apellido: "Pérez",
      telefono: "123456789",
    },
    // ... otros campos
  };

  abrirMapa(solicitud: Solicitud): void {
    // Abrir Google Maps con la dirección
    const url = `https://www.google.com/maps/search/?api=1&query=${solicitud.direccion_origen}`;
    window.open(url, "_blank");
  }

  iniciarViaje(solicitud: Solicitud): void {
    if (confirm("¿Desea iniciar el viaje?")) {
      this.solicitudService.cambiarEstado(solicitud.solicitud_id, "en viaje");
    }
  }

  finalizarViaje(solicitud: Solicitud): void {
    if (confirm("¿Desea completar el viaje?")) {
      this.solicitudService.cambiarEstado(solicitud.solicitud_id, "completado");
    }
  }

  enviarMensajeCliente(solicitud: Solicitud): void {
    // Abrir chat o WhatsApp con el cliente
    const mensaje = encodeURIComponent(`Hola, soy tu fletero para el pedido #${solicitud.solicitud_id}`);
    const url = `https://wa.me/${solicitud.cliente.telefono}?text=${mensaje}`;
    window.open(url, "_blank");
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

1. **Campo `_hayAceptado`**: Debe ser agregado dinámicamente al objeto Solicitud (solo modo cliente)
2. **Campo `_totalMostrables`**: Total de presupuestos disponibles (solo modo cliente)
3. **URLs de fotos**: Se manejan automáticamente a través de `SolicitudFlaskService.obtenerUrlFoto()`
4. **Estados**: Usar exactamente: "pendiente", "sin transportista", "en viaje", "completado"
5. **Campo `cliente`**: Requerido en modo fletero para mostrar información del cliente
6. **Servicio `SolicitudFlaskService`**: Debe estar disponible e inyectado correctamente

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
import { RouterLink } from "@angular/router";
import { SolicitudFlaskService } from "../../../../modules/data-access/solicitud-flask.service";
```

Componente standalone con las siguientes dependencias:

- **CommonModule**: Directivas básicas de Angular
- **RouterLink**: Navegación para botón de cotización (modo fletero)
- **SolicitudFlaskService**: Servicio para obtener URLs de fotos
