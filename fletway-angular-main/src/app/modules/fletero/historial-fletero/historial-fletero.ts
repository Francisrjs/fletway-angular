import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, Type } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/data-access/auth-service';
import { Solicitud } from '../../../core/layouts/solicitud';
import { SolcitudService } from '../../data-access/solicitud-service';
import { SolicitudFlaskService } from '../../data-access/solicitud-flask.service';
import { SolicitudesListComponent } from '../../../shared/features/solicitudes/solicitudes-list/solicitudes-list.component';
import { SidebarComponent } from '../../../shared/features/sidebar';
import { PopupComponent } from '../../../shared/features/popup/popup.component';
import { PopupModalService } from '../../../shared/modal/popup';
import { MapComponent } from '../../../shared/features/map/map';

@Component({
  selector: 'app-historial-fletero',
  templateUrl: './historial-fletero.html',
  standalone: true,
  imports: [
    CommonModule,
    SolicitudesListComponent,
    SidebarComponent,
    PopupComponent,
  ],
})
export class HistorialFleteroComponent implements OnInit {
  private _solService = inject(SolcitudService);
  private _solFlaskService = inject(SolicitudFlaskService);
  private _authService = inject(AuthService);
  private popupModalService = inject(PopupModalService);
  private _router = inject(Router);

  // Sidebar parametros
  sidebarVisible = false;
  sidebarTitle = '';
  componentToLoad: Type<any> | undefined;
  sidebarInputs: any = {};

  // Popup mapa parametros
  popupMapaAbierto = false;
  popupMapaComponente: Type<any> | undefined;
  popupMapaInputs: any = {};

  // Lista de solicitudes del fletero
  solicitudes: Solicitud[] = [];

  loading = false;
  error: string | null = null;

  // Modal de foto
  fotoModalAbierta = false;
  fotoModalUrl: string | null = null;
  fotoModalTitulo: string | null = null;

  async ngOnInit(): Promise<void> {
    await this.cargarHistorialFletero();
  }

  /**
   * Carga el historial de viajes del fletero actual
   */
  async cargarHistorialFletero(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      // Obtiene las solicitudes donde el fletero actual es el transportista
      const data = await this._solService.getHistorialFletero();
      this.solicitudes = this.mapearConFotoUrl(data ?? []);
      console.log('📋 Historial de viajes del fletero:', this.solicitudes);
    } catch (err) {
      console.error('❌ Error cargando historial del fletero:', err);
      this.error = 'Error cargando el historial de viajes';
    } finally {
      this.loading = false;
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
    return this._solFlaskService.obtenerUrlFoto(solicitud.foto);
  }

  // Handlers para los eventos de la lista
  onVerMapa(solicitud: Solicitud): void {
    this.verMapa(solicitud);
  }

  onVerFoto(solicitud: Solicitud): void {
    this.abrirFotoModal(solicitud);
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

  // Sidebar handlers
  handleSidebarOutputs(evento: { event: string; data: any }): void {
    console.log('📤 Evento del sidebar:', evento.event, 'Data:', evento.data);
  }

  /**
   * Abre el popup del mapa con la ruta de la solicitud
   */
  verMapa(solicitud: Solicitud): void {
    console.log('🗺️ Abriendo mapa en popup:', solicitud);

    this.popupMapaComponente = MapComponent;
    this.popupMapaInputs = {
      direccionOrigen: solicitud.direccion_origen,
      ciudadOrigen: solicitud.localidad_origen?.nombre || '',
      localidadOrigen: solicitud.localidad_origen?.provincia || '',
      direccionDestino: solicitud.direccion_destino,
      ciudadDestino: solicitud.localidad_destino?.nombre || '',
      localidadDestino: solicitud.localidad_destino?.provincia || '',
    };
    this.popupMapaAbierto = true;
  }

  /**
   * Navega a los detalles de una solicitud
   */
  verDetalle(solicitud: Solicitud): void {
    this._router.navigate(['/fletero/detalle', solicitud.solicitud_id]);
  }
}
