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
  /**
   * Modo de visualización del card:
   * - 'cliente': Muestra información del transportista y botones para cliente
   * - 'fletero': Muestra información del cliente y botones para fletero
   */
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

  /**
   * Carga las fotos de la solicitud desde la tabla fotos de Supabase
   */
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

  /**
   * Eventos específicos para modo fletero
   */
  onRealizarViaje(): void {
    this.realizarViaje.emit(this.solicitud);
  }

  onCompletarViaje(): void {
    this.completarViaje.emit(this.solicitud);
  }

  onRealizarCotizacion(): void {
    this.realizarCotizacion.emit(this.solicitud);
  }

  onEnviarMensaje(): void {
    this.enviarMensaje.emit(this.solicitud);
  }

  /**
   * Abre el popup para ver una foto en grande
   */
  abrirPopupFoto(index: number): void {
    this.fotoSeleccionadaIndex = index;
    this.mostrarPopupFoto = true;
  }

  /**
   * Cierra el popup de foto
   */
  cerrarPopupFoto(): void {
    this.mostrarPopupFoto = false;
    this.fotoSeleccionadaIndex = null;
  }

  /**
   * Obtiene la URL de una foto (ya viene completa desde Supabase)
   */
  obtenerUrlFoto(foto: any): string {
    return foto?.url || 'boxes.png';
  }

  /**
   * Maneja el error de carga de imagen
   */
  handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'boxes.png';
    }
  }

  /**
   * Indica si está en modo cliente
   */
  get esCliente(): boolean {
    return this.modo === 'cliente';
  }

  /**
   * Indica si está en modo fletero
   */
  get esFletero(): boolean {
    return this.modo === 'fletero';
  }
}
