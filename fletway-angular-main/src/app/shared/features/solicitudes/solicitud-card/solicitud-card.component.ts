import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Solicitud } from '../../../../core/layouts/solicitud';

@Component({
  selector: 'app-solicitud-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './solicitud-card.component.html',
})
export class SolicitudCardComponent {
  @Input() solicitud!: Solicitud;
  @Input() mostrarBotones: boolean = true;

  @Output() verMapa = new EventEmitter<Solicitud>();
  @Output() verPresupuestos = new EventEmitter<Solicitud>();
  @Output() cancelarPedido = new EventEmitter<Solicitud>();
  @Output() calificar = new EventEmitter<Solicitud>();
  @Output() verFoto = new EventEmitter<Solicitud>();

  get badgeClass(): string {
    const estado = (this.solicitud.estado || '').toLowerCase();
    switch (estado) {
      case 'completado':
      case 'entregado':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'en viaje':
      case 'en camino':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'sin transportista':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'pendiente':
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  }

  tieneFoto(): boolean {
    return !!this.solicitud.foto && this.solicitud.foto.trim().length > 0;
  }

  get estadoTransportista(): 'asignado' | 'buscando' {
    return (this.solicitud as any)._hayAceptado ? 'asignado' : 'buscando';
  }

  get totalPresupuestos(): number {
    return (this.solicitud as any)._totalMostrables ?? 0;
  }

  get transportista(): any {
    return (this.solicitud as any).presupuesto?.transportista;
  }

  get calificacionPromedio(): number | null {
    const transp = this.transportista;
    if (!transp || transp.cantidad_calificaciones === 0) {
      return null;
    }
    return transp.total_calificaciones / transp.cantidad_calificaciones;
  }

  get puedeCalificar(): boolean {
    return (
      this.solicitud.estado === 'completado' &&
      !(this.solicitud as any).calificacion
    );
  }

  onVerMapa(): void {
    this.verMapa.emit(this.solicitud);
  }

  onVerPresupuestos(): void {
    this.verPresupuestos.emit(this.solicitud);
  }

  onCancelar(): void {
    this.cancelarPedido.emit(this.solicitud);
  }

  onCalificar(): void {
    this.calificar.emit(this.solicitud);
  }

  onVerFoto(): void {
    this.verFoto.emit(this.solicitud);
  }
}
