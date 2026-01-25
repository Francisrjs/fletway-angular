import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Solicitud } from '../../../../core/layouts/solicitud';
import { SolicitudCardComponent } from '../solicitud-card/solicitud-card.component';
import { SolicitudSkeletonComponent } from '../solicitud-skeleton/solicitud-skeleton.component';

export type FiltroEstado =
  | 'todos'
  | 'pendiente'
  | 'sin transportista'
  | 'en viaje'
  | 'completado';

@Component({
  selector: 'app-solicitudes-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SolicitudCardComponent,
    SolicitudSkeletonComponent,
  ],
  templateUrl: './solicitudes-list.component.html',
})
export class SolicitudesListComponent {
  @Input() solicitudes: Solicitud[] = [];
  @Input() loading: boolean = false;
  @Input() titulo: string = 'Solicitudes';
  @Input() mostrarBotonAgregar: boolean = true;
  @Input() modo: 'cliente' | 'fletero' = 'cliente';
  @Input() mostrarBotones: boolean = true;
  @Output() agregarPedido = new EventEmitter<void>();
  @Output() verMapa = new EventEmitter<Solicitud>();
  @Output() verPresupuestos = new EventEmitter<Solicitud>();
  @Output() cancelarPedido = new EventEmitter<Solicitud>();
  @Output() calificar = new EventEmitter<Solicitud>();
  @Output() verFoto = new EventEmitter<Solicitud>();
  @Output() enviarMensaje = new EventEmitter<Solicitud>();
  searchTerm: string = '';
  filtroEstado: FiltroEstado = 'todos';
  mostrarFiltros: boolean = false;

  get solicitudesFiltradas(): Solicitud[] {
    let resultado = [...this.solicitudes];

    if (this.searchTerm.trim()) {
      const termino = this.searchTerm.toLowerCase();
      resultado = resultado.filter(
        (s) =>
          s.detalles_carga?.toLowerCase().includes(termino) ||
          s.direccion_origen?.toLowerCase().includes(termino) ||
          s.direccion_destino?.toLowerCase().includes(termino) ||
          s.solicitud_id.toString().includes(termino),
      );
    }

    if (this.filtroEstado !== 'todos') {
      resultado = resultado.filter(
        (s) =>
          (s.estado || '').toLowerCase() === this.filtroEstado.toLowerCase(),
      );
    }

    return this.ordenarSolicitudes(resultado);
  }

  private ordenarSolicitudes(solicitudes: Solicitud[]): Solicitud[] {
    const ordenPrioridad: { [key: string]: number } = {
      'en viaje': 1,
      pendiente: 2,
      'sin transportista': 3,
      completado: 4,
    };

    return solicitudes.sort((a, b) => {
      const estadoA = (a.estado || 'sin transportista').toLowerCase();
      const estadoB = (b.estado || 'sin transportista').toLowerCase();
      const prioridadA = ordenPrioridad[estadoA] || 999;
      const prioridadB = ordenPrioridad[estadoB] || 999;

      if (prioridadA !== prioridadB) {
        return prioridadA - prioridadB;
      }

      return (
        new Date(b.fecha_creacion || 0).getTime() -
        new Date(a.fecha_creacion || 0).getTime()
      );
    });
  }

  get estadosDisponibles(): FiltroEstado[] {
    return [
      'todos',
      'en viaje',
      'pendiente',
      'sin transportista',
      'completado',
    ];
  }

  get skeletonArray(): number[] {
    return Array(3).fill(0);
  }

  toggleFiltros(): void {
    this.mostrarFiltros = !this.mostrarFiltros;
  }

  seleccionarFiltro(estado: FiltroEstado): void {
    this.filtroEstado = estado;
    this.mostrarFiltros = false;
  }

  limpiarBusqueda(): void {
    this.searchTerm = '';
  }

  onAgregarPedido(): void {
    this.agregarPedido.emit();
  }

  onVerMapa(solicitud: Solicitud): void {
    this.verMapa.emit(solicitud);
  }

  onVerPresupuestos(solicitud: Solicitud): void {
    this.verPresupuestos.emit(solicitud);
  }

  onCancelarPedido(solicitud: Solicitud): void {
    this.cancelarPedido.emit(solicitud);
  }

  onCalificar(solicitud: Solicitud): void {
    this.calificar.emit(solicitud);
  }

  onVerFoto(solicitud: Solicitud): void {
    this.verFoto.emit(solicitud);
  }

  get cantidadResultados(): number {
    return this.solicitudesFiltradas.length;
  }

  get hayFiltrosActivos(): boolean {
    return this.filtroEstado !== 'todos' || this.searchTerm.trim().length > 0;
  }
  onEnviarMensaje(solicitud: Solicitud): void {
    console.log(
      '📤 Lista recibió evento enviarMensaje, propagando a padre:',
      solicitud.solicitud_id,
    );
    this.enviarMensaje.emit(solicitud);
  }
}
