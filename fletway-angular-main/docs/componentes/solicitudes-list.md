# SolicitudesListComponent

Componente reutilizable para mostrar listas de solicitudes con funcionalidades de búsqueda, filtrado y ordenamiento.

## 📍 Ubicación

```
src/app/shared/features/solicitudes/solicitudes-list/
```

## 🎯 Propósito

Proporciona una interfaz completa para visualizar, buscar y filtrar solicitudes de flete con diseño responsivo y minimalista.

## 📥 Inputs

| Input                 | Tipo          | Default         | Descripción                             |
| --------------------- | ------------- | --------------- | --------------------------------------- |
| `solicitudes`         | `Solicitud[]` | `[]`            | Array de solicitudes a mostrar          |
| `loading`             | `boolean`     | `false`         | Indica si está cargando datos           |
| `titulo`              | `string`      | `'Solicitudes'` | Título de la lista                      |
| `mostrarBotonAgregar` | `boolean`     | `true`          | Muestra/oculta el botón "Añadir pedido" |

## 📤 Outputs

| Output            | Tipo                      | Descripción                             |
| ----------------- | ------------------------- | --------------------------------------- |
| `agregarPedido`   | `EventEmitter<void>`      | Emite cuando se clickea "Añadir pedido" |
| `verMapa`         | `EventEmitter<Solicitud>` | Emite solicitud para ver en mapa        |
| `verPresupuestos` | `EventEmitter<Solicitud>` | Emite solicitud para ver presupuestos   |
| `cancelarPedido`  | `EventEmitter<Solicitud>` | Emite solicitud para cancelar           |
| `calificar`       | `EventEmitter<Solicitud>` | Emite solicitud para calificar          |
| `verFoto`         | `EventEmitter<Solicitud>` | Emite solicitud para ver foto           |

## 🎨 Características

### Búsqueda

- Búsqueda en tiempo real por:
  - Nombre del pedido
  - Dirección de origen
  - Dirección de destino
  - ID de solicitud
- Botón para limpiar búsqueda

### Filtros

- Filtro por estado con opciones:
  - **Todos**: Sin filtro
  - **En viaje**: Solicitudes en tránsito
  - **Pendiente**: Esperando transportista
  - **Sin transportista**: Sin asignación
  - **Completado**: Finalizadas
- Indicador visual de filtros activos

### Ordenamiento Automático

Las solicitudes se ordenan por prioridad:

1. **En viaje** (mayor prioridad)
2. **Pendiente**
3. **Sin transportista**
4. **Completado** (menor prioridad)

Dentro de cada estado, se ordenan por fecha (más recientes primero).

### Estados Vacíos

- Mensaje diferenciado cuando no hay solicitudes
- Mensaje específico cuando no hay resultados de búsqueda/filtro
- Botón para limpiar filtros activos

### Skeleton Loader

- Muestra 3 skeletons mientras carga
- Animación pulse para mejor UX

## 💻 Ejemplo de Uso

```typescript
import { Component } from "@angular/core";
import { SolicitudesListComponent } from "@shared/features/solicitudes";
import { Solicitud } from "@core/layouts/solicitud";

@Component({
  selector: "app-mis-pedidos",
  standalone: true,
  imports: [SolicitudesListComponent],
  template: ` <app-solicitudes-list [solicitudes]="solicitudes" [loading]="loading" titulo="Mis Pedidos" [mostrarBotonAgregar]="true" (agregarPedido)="onAgregarPedido()" (verMapa)="onVerMapa($event)" (verPresupuestos)="onVerPresupuestos($event)" (cancelarPedido)="onCancelarPedido($event)" (calificar)="onCalificar($event)" (verFoto)="onVerFoto($event)"></app-solicitudes-list> `,
})
export class MisPedidosComponent {
  solicitudes: Solicitud[] = [];
  loading = false;

  onAgregarPedido(): void {
    // Navegar a formulario de nueva solicitud
    this.router.navigate(["/nueva-solicitud"]);
  }

  onVerMapa(solicitud: Solicitud): void {
    // Abrir mapa con la solicitud
    console.log("Ver mapa:", solicitud);
  }

  onVerPresupuestos(solicitud: Solicitud): void {
    // Navegar a presupuestos
    this.router.navigate(["/presupuestos", solicitud.solicitud_id]);
  }

  onCancelarPedido(solicitud: Solicitud): void {
    // Mostrar confirmación y cancelar
    if (confirm("¿Cancelar pedido?")) {
      this.solicitudService.cancelar(solicitud.solicitud_id);
    }
  }

  onCalificar(solicitud: Solicitud): void {
    // Abrir modal de calificación
    this.modalCalificacion.open(solicitud);
  }

  onVerFoto(solicitud: Solicitud): void {
    // Abrir modal con foto
    this.modalFoto.open(solicitud.foto);
  }
}
```

## 🎭 Componentes Internos

### SolicitudCardComponent

Card individual para cada solicitud (ver documentación separada).

### SolicitudSkeletonComponent

Skeleton loader con animación pulse.

## 📱 Responsividad

- **Móvil**: Grid de 1 columna
- **Tablet**: Grid de 2 columnas
- **Desktop**: Grid de 3 columnas

## 🎨 Estilos y Diseño

- Usa Tailwind CSS
- Colores de la paleta Fletway (#FF6F00 naranja principal)
- Sombras sutiles y efectos hover
- Animaciones suaves (300ms)
- Compatible con dark mode (preparado)

## 🔧 Métodos Públicos

| Método                      | Descripción                        |
| --------------------------- | ---------------------------------- |
| `limpiarBusqueda()`         | Limpia el término de búsqueda      |
| `toggleFiltros()`           | Abre/cierra el dropdown de filtros |
| `seleccionarFiltro(estado)` | Selecciona un filtro específico    |

## 📊 Getters Computados

| Getter                 | Tipo             | Descripción                     |
| ---------------------- | ---------------- | ------------------------------- |
| `solicitudesFiltradas` | `Solicitud[]`    | Lista filtrada y ordenada       |
| `estadosDisponibles`   | `FiltroEstado[]` | Estados disponibles para filtro |
| `cantidadResultados`   | `number`         | Total de resultados filtrados   |
| `hayFiltrosActivos`    | `boolean`        | Indica si hay filtros activos   |

## ⚠️ Notas Importantes

1. El componente requiere que las solicitudes tengan la interfaz `Solicitud` con los campos necesarios
2. Las fotos deben estar en formato de URL completa
3. Los estados deben coincidir con: "pendiente", "sin transportista", "en viaje", "completado"
4. El componente maneja automáticamente estados vacíos y errores de carga

## 🔗 Dependencias

```typescript
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SolicitudCardComponent } from "../solicitud-card/solicitud-card.component";
import { SolicitudSkeletonComponent } from "../solicitud-skeleton/solicitud-skeleton.component";
```

## 📦 Export

```typescript
export { SolicitudesListComponent, FiltroEstado };
```
