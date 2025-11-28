import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/data-access/auth-service';
import { Solicitud } from '../../../core/layouts/solicitud';
import { SolcitudService } from '../../data-access/solicitud-service';
import { PresupuestoService } from '../../data-access/presupuesto-service';
import { SolicitudFlaskService } from '../../data-access/solicitud-flask.service';

@Component({
  selector: 'app-cliente',
  templateUrl: './cliente-component.html',
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class ClienteComponent implements OnInit {
  private _solService = inject(SolcitudService);
  private _authService = inject(AuthService);
  private _presupuestoService = inject(PresupuestoService);
  private _solicitudFlaskService = inject(SolicitudFlaskService);

  solicitudes: Solicitud[] = [];
  solicitudes_pendientes: Solicitud[] = [];
  loading = false;
  error: string | null = null;
  
  // Para el modal de fotos
  fotoModalAbierta = false;
  fotoModalUrl: string | null = null;
  fotoModalTitulo: string | null = null;

  async ngOnInit(): Promise<void> {
    this.loading = true;
    try {
      const data = await this._solService.getAllPedidosUsuario();
      const dataPendiente = await this._solService.getAllPedidosEnViaje();

      if (data) {
        this.solicitudes = data ?? [];
        this.solicitudes_pendientes = dataPendiente ?? [];

        // DEBUG: Verificar que las solicitudes tienen el campo foto
        console.log('📦 Solicitudes cargadas:', this.solicitudes);
        this.solicitudes.forEach((s, i) => {
          console.log(`Solicitud ${i + 1}:`, {
            id: s.solicitud_id,
            detalles: s.detalles_carga,
            foto: s.foto,
            tieneFoto: this.tieneFoto(s),
            url: this.obtenerUrlFoto(s),
          });
        });

        console.log('t@usuario ', this._authService.session());
        await this.anotarResumenesPresupuestos();
      } else {
        this.solicitudes = [];
        this.solicitudes_pendientes = [];
      }
    } catch (err) {
      console.error(err);
      this.error = 'Error cargando solicitudes';
    } finally {
      this.loading = false;
    }
  }

  /**
   * Obtiene la URL completa de la foto de una solicitud
   */
  obtenerUrlFoto(solicitud: Solicitud): string | null {
    // Verifica que la solicitud tenga foto
    if (!solicitud.foto) {
      return null;
    }

    // Usa el servicio Flask para obtener la URL
    return this._solicitudFlaskService.obtenerUrlFoto(solicitud.foto);
  }

  /**
   * Verifica si la solicitud tiene foto
   */
  tieneFoto(solicitud: Solicitud): boolean {
    const tieneFoto = !!solicitud.foto && solicitud.foto.trim().length > 0;

    return tieneFoto;
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
   * Abre el modal de visualización de foto
   */
  abrirFotoModal(solicitud: Solicitud): void {
    const url = this.obtenerUrlFoto(solicitud);
    if (url) {
      this.fotoModalUrl = url;
      this.fotoModalTitulo = solicitud.detalles_carga || `Foto de pedido #${solicitud.solicitud_id}`;
      this.fotoModalAbierta = true;
    }
  }

  /**
   * Cierra el modal de visualización de foto
   */
  cerrarFotoModal(): void {
    this.fotoModalAbierta = false;
    this.fotoModalUrl = null;
    this.fotoModalTitulo = null;
  }

  // Devuelve clase para badge según estado
  badgeClass(estado: string | null | undefined) {
    switch ((estado || '').toLowerCase()) {
      case 'completado':
      case 'entregado':
        return 'bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-sm dark:bg-green-900 dark:text-green-300';
      case 'en camino':
        return 'bg-yellow-100 text-yellow-800 text-xs font-medium px-3.5 py-0.5 rounded-sm dark:bg-yellow-900 dark:text-yellow-300';
      case 'sin transportista':
      case 'pendiente':
      default:
        return 'bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-sm dark:bg-blue-900 dark:text-blue-300';
    }
  }

  // Abrir Google Maps con la dirección (origen ó destino)
  openMap(s: Solicitud, useOrigen = true) {
    const direccion = useOrigen ? s.direccion_origen : s.direccion_destino;
    const localidad = s.localidad_origen?.nombre ?? '';
    const query = encodeURIComponent(`${direccion} ${localidad}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  }

  private async anotarResumenesPresupuestos() {
    if (!Array.isArray(this.solicitudes) || this.solicitudes.length === 0)
      return;

    const resúmenes = await Promise.all(
      this.solicitudes.map((s: Solicitud) =>
        this._presupuestoService
          .getResumenPresupuestos(s.solicitud_id)
          .catch(() => ({ mostrables: 0, hayAceptado: false })),
      ),
    );

    this.solicitudes = this.solicitudes.map((s: Solicitud, i: number) => ({
      ...s,
      _totalMostrables: resúmenes[i].mostrables,
      _hayAceptado: resúmenes[i].hayAceptado,
    }));
  }
}
