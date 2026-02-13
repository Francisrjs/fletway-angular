import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Solicitud } from '../../../../core/layouts/solicitud';
import { SolicitudFlaskService } from '../../../../modules/data-access/solicitud-flask.service';
import { SolcitudService } from '../../../../modules/data-access/solicitud-service';

@Component({
  selector: 'app-solicitud-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './solicitud-card.component.html',
})
export class SolicitudCardComponent implements OnInit {
  private _solicitudFlaskService = inject(SolicitudFlaskService);
  private _solicitudService = inject(SolcitudService);

  @Input() solicitud!: Solicitud;
  @Input() mostrarBotones: boolean = true;
  @Input() modo: 'cliente' | 'fletero' = 'cliente';

  // Fotos desde Supabase
  fotos: any[] = [];
  cargandoFotos = false;
  fotoSeleccionadaIndex: number | null = null;
  mostrarPopupFoto = false;

  // Eventos para ambos modos
  @Output() verMapa = new EventEmitter<Solicitud>();
  @Output() verFoto = new EventEmitter<Solicitud>();

  // Eventos específicos para cliente
  @Output() verPresupuestos = new EventEmitter<Solicitud>();
  @Output() cancelarPedido = new EventEmitter<Solicitud>();
  @Output() calificar = new EventEmitter<Solicitud>();
  @Output() editarSolicitud = new EventEmitter<Solicitud>();
  
  // Eventos específicos para fletero
  @Output() realizarViaje = new EventEmitter<Solicitud>();
  @Output() completarViaje = new EventEmitter<Solicitud>();
  @Output() realizarCotizacion = new EventEmitter<Solicitud>();
  @Output() enviarMensaje = new EventEmitter<Solicitud>();

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

  async ngOnInit(): Promise<void> {
    await this.cargarFotos();
  }

  async cargarFotos(): Promise<void> {
    if (!this.solicitud?.solicitud_id) return;

    this.cargandoFotos = true;
    try {
      this.fotos = await this._solicitudService.getFotosBySolicitudId(
        this.solicitud.solicitud_id,
      );
    } catch (error) {
      console.error('Error cargando fotos:', error);
      this.fotos = [];
    } finally {
      this.cargandoFotos = false;
    }
  }

  tieneFoto(): boolean {
    return this.fotos.length > 0;
  }

  get fotoPrincipal(): any | null {
    return this.fotos.length > 0 ? this.fotos[0] : null;
  }

  get fotosSecundarias(): any[] {
    return this.fotos.slice(1);
  }

  get estadoTransportista(): 'asignado' | 'buscando' {
    // Verificar si tiene transportista asignado
    const tieneTransportista = this.solicitud?.presupuesto?.transportista;
    return tieneTransportista ? 'asignado' : 'buscando';
  }

  get totalPresupuestos(): number {
    return (this.solicitud as any)._cantidadPresupuestos ?? 0;
  }

  get tienePresupuestos(): boolean {
    return (this.solicitud as any)._tienePresupuestos ?? false;
  }

  get transportista(): any {
    return (this.solicitud as any).presupuesto?.transportista;
  }

  // ✅ NUEVO: Getter para estadísticas desde datos enriquecidos
  get estadisticasTransportista(): any {
    return (this.solicitud as any)._estadisticas || null;
  }

  // ✅ CORREGIDO: Usar estadísticas enriquecidas
  get calificacionPromedio(): number | null {
    // Primero intentar con estadísticas enriquecidas
    const stats = this.estadisticasTransportista;
    if (stats && stats.total_calificaciones > 0) {
      return stats.calificacion_promedio;
    }

    // Fallback: Calcular desde transportista (por si acaso)
    const transp = this.transportista;
    if (transp && transp.total_calificaciones > 0) {
      return transp.calificacion_promedio || 0;
    }

    return null;
  }

  // ✅ NUEVO: Total de calificaciones
  get totalCalificaciones(): number {
    const stats = this.estadisticasTransportista;
    if (stats) {
      return stats.total_calificaciones || 0;
    }

    const transp = this.transportista;
    return transp?.total_calificaciones || 0;
  }

  // ✅ NUEVO: Verificar si ya fue calificado
  get yaCalificado(): boolean {
    const calificacion = (this.solicitud as any)._calificacion;
    return !!calificacion;
  }

  // ✅ NUEVO: Obtener la calificación existente
  get miCalificacion(): any {
    return (this.solicitud as any)._calificacion || null;
  }

  // ✅ CORREGIDO: Lógica completa para poder calificar
  get puedeCalificar(): boolean {
    // Debe estar completada
    if (this.solicitud.estado !== 'completado') {
      return false;
    }

    // NO debe tener calificación ya
    if (this.yaCalificado) {
      return false;
    }

    // Debe tener transportista asignado
    if (!this.transportista) {
      return false;
    }

    return true;
  }

  // ✅ NUEVO: Array de estrellas para mostrar calificación
  get estrellasCalificacion(): boolean[] {
    if (!this.miCalificacion) return [];
    
    const puntuacion = this.miCalificacion.puntuacion || 0;
    return Array(5).fill(false).map((_, i) => i < puntuacion);
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

  onRealizarViaje(): void {
    this.realizarViaje.emit(this.solicitud);
  }

  onCompletarViaje(): void {
    console.log(
      '📢 Evento completarViaje disparado desde solicitud-card:',
      this.solicitud.solicitud_id,
    );
    this.completarViaje.emit(this.solicitud);
  }

  onRealizarCotizacion(): void {
    this.realizarCotizacion.emit(this.solicitud);
  }

  onEnviarMensaje(): void {
    this.enviarMensaje.emit(this.solicitud);
  }
  
  onEditarSolicitud(): void {
    this.editarSolicitud.emit(this.solicitud);
  }

  abrirPopupFoto(index: number): void {
    this.fotoSeleccionadaIndex = index;
    this.mostrarPopupFoto = true;
  }

  cerrarPopupFoto(): void {
    this.mostrarPopupFoto = false;
    this.fotoSeleccionadaIndex = null;
  }

  obtenerUrlFoto(foto: any): string {
    return foto?.url || 'boxes.png';
  }

  handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'boxes.png';
    }
  }

  get esCliente(): boolean {
    return this.modo === 'cliente';
  }

  get esFletero(): boolean {
    return this.modo === 'fletero';
  }
}
