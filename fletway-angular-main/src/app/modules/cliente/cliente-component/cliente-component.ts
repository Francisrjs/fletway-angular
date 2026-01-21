import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/data-access/auth-service';
import { Solicitud } from '../../../core/layouts/solicitud';
import { SolcitudService } from '../../data-access/solicitud-service';
import { PresupuestoService } from '../../data-access/presupuesto-service';
import { SolicitudFlaskService } from '../../data-access/solicitud-flask.service';
import { SolicitudesListComponent } from '../../../shared/features/solicitudes/solicitudes-list/solicitudes-list.component';

@Component({
  selector: 'app-cliente',
  templateUrl: './cliente-component.html',
  standalone: true,
  imports: [CommonModule, SolicitudesListComponent],
})
export class ClienteComponent implements OnInit {
  private _solService = inject(SolcitudService);
  private _authService = inject(AuthService);
  private _presupuestoService = inject(PresupuestoService);
  private _solicitudFlaskService = inject(SolicitudFlaskService);
  private _router = inject(Router);

  solicitudes: Solicitud[] = [];
  solicitudes_pendientes: Solicitud[] = [];
  loading = false;
  loadingPendientes = false;
  error: string | null = null;

  fotoModalAbierta = false;
  fotoModalUrl: string | null = null;
  fotoModalTitulo: string | null = null;

  modalCalificacionAbierto = false;
  calificacionSeleccionada: number | null = null;
  solicitudSeleccionada: any = null;
  numerosCalificacion = Array.from({ length: 11 }, (_, i) => i);

  async ngOnInit(): Promise<void> {
    await this.cargarSolicitudes();
  }

  async cargarSolicitudes(): Promise<void> {
    this.loading = true;
    this.loadingPendientes = true;
    try {
      const [data, dataPendiente] = await Promise.all([
        this._solService.getAllPedidosUsuario(),
        this._solService.getAllPedidosEnViaje(),
      ]);

      this.solicitudes = data ?? [];
      this.solicitudes_pendientes = dataPendiente ?? [];

      console.log('📦 Solicitudes cargadas:', this.solicitudes);
      console.log('🚚 Solicitudes en viaje:', this.solicitudes_pendientes);
      console.log('👤 Usuario:', this._authService.session());

      await Promise.all([
        this.anotarResumenesPresupuestos(this.solicitudes),
        this.anotarResumenesPresupuestos(this.solicitudes_pendientes),
      ]);

      this.solicitudes = this.mapearConFotoUrl(this.solicitudes);
      this.solicitudes_pendientes = this.mapearConFotoUrl(
        this.solicitudes_pendientes,
      );
    } catch (err) {
      console.error('❌ Error cargando solicitudes:', err);
      this.error = 'Error cargando solicitudes';
    } finally {
      this.loading = false;
      this.loadingPendientes = false;
    }
  }

  private mapearConFotoUrl(solicitudes: Solicitud[]): Solicitud[] {
    return solicitudes.map((s) => ({
      ...s,
      foto: this.obtenerUrlFoto(s),
    }));
  }

  obtenerUrlFoto(solicitud: Solicitud): string | null {
    if (!solicitud.foto) {
      return null;
    }
    return this._solicitudFlaskService.obtenerUrlFoto(solicitud.foto);
  }

  abrirFotoModal(solicitud: Solicitud): void {
    const url = solicitud.foto;
    if (url) {
      this.fotoModalUrl = url;
      this.fotoModalTitulo =
        solicitud.detalles_carga || `Foto de pedido #${solicitud.solicitud_id}`;
      this.fotoModalAbierta = true;
    }
  }

  cerrarFotoModal(): void {
    this.fotoModalAbierta = false;
    this.fotoModalUrl = null;
    this.fotoModalTitulo = null;
  }

  onAgregarPedido(): void {
    this._router.navigate(['/cliente/nuevaSolicitud']);
  }

  onVerMapa(solicitud: Solicitud): void {
    this.openMap(solicitud, true);
  }

  onVerPresupuestos(solicitud: Solicitud): void {
    this._router.navigate([
      '/cliente/detallePresupuesto',
      solicitud.solicitud_id,
    ]);
  }

  onCancelarPedido(solicitud: Solicitud): void {
    console.log('🗑️ Cancelar pedido:', solicitud.solicitud_id);
  }

  onCalificar(solicitud: Solicitud): void {
    this.abrirModalCalificacion(solicitud);
  }

  abrirModalCalificacion(solicitud: any): void {
    this.solicitudSeleccionada = solicitud;
    this.calificacionSeleccionada = null;
    this.modalCalificacionAbierto = true;
  }

  cerrarModalCalificacion(): void {
    this.modalCalificacionAbierto = false;
    this.calificacionSeleccionada = null;
  }

  seleccionarCalificacion(valor: number): void {
    this.calificacionSeleccionada = valor;
  }

  async aceptarCalificacion(): Promise<void> {
    if (this.calificacionSeleccionada === null || !this.solicitudSeleccionada) {
      return;
    }

    const solicitud = this.solicitudSeleccionada;
    const transportista = solicitud.presupuesto.transportista;

    try {
      await this._solService.calificarSolicitud(
        solicitud.solicitud_id,
        transportista.transportista_id,
        this.calificacionSeleccionada,
        transportista.cantidad_calificaciones ?? 0,
        transportista.total_calificaciones ?? 0,
      );

      solicitud.calificacion = this.calificacionSeleccionada;
      transportista.cantidad_calificaciones =
        (transportista.cantidad_calificaciones ?? 0) + 1;
      transportista.total_calificaciones =
        (transportista.total_calificaciones ?? 0) +
        this.calificacionSeleccionada;

      this.cerrarModalCalificacion();
      console.log('⭐ Calificación enviada:', this.calificacionSeleccionada);
    } catch (error) {
      console.error('Error al calificar solicitud', error);
    }
  }

  openMap(s: Solicitud, useOrigen = true): void {
    const direccion = useOrigen ? s.direccion_origen : s.direccion_destino;
    const localidad = s.localidad_origen?.nombre ?? '';
    const query = encodeURIComponent(`${direccion} ${localidad}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  }

  private async anotarResumenesPresupuestos(
    solicitudes: Solicitud[],
  ): Promise<void> {
    if (!Array.isArray(solicitudes) || solicitudes.length === 0) {
      return;
    }

    const resúmenes = await Promise.all(
      solicitudes.map((s: Solicitud) =>
        this._presupuestoService
          .getResumenPresupuestos(s.solicitud_id)
          .catch(() => ({ mostrables: 0, hayAceptado: false })),
      ),
    );

    solicitudes.forEach((s: Solicitud, i: number) => {
      (s as any)._totalMostrables = resúmenes[i].mostrables;
      (s as any)._hayAceptado = resúmenes[i].hayAceptado;
    });
  }
}
