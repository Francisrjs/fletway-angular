import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, Type } from '@angular/core';
import { Router } from '@angular/router';

import { Solicitud } from '../../../core/layouts/solicitud';
import { SolcitudService } from '../../data-access/solicitud-service';
import { PopupModalService } from '../../../shared/modal/popup';
import { SolicitudFlaskService } from '../../data-access/solicitud-flask.service';
import { SolicitudCardComponent } from '../../../shared/features/solicitudes/solicitud-card/solicitud-card.component';
import { SidebarComponent } from '../../../shared/features/sidebar';
import { PopupComponent } from '../../../shared/features/popup/popup.component';
import { MapComponent } from '../../../shared/features/map/map';

@Component({
  selector: 'app-fletero',
  templateUrl: './fletero-component.html',
  styleUrls: ['./fletero-component.scss'],
  imports: [
    CommonModule,
    SolicitudCardComponent,
    SidebarComponent,
    PopupComponent,
  ],
})
export class FleteroComponent implements OnInit {
  private _solService = inject(SolcitudService);
  private popupModalService = inject(PopupModalService);
  private _solicitudFlaskService = inject(SolicitudFlaskService);
  private _router = inject(Router);

  solicitudes: Solicitud[] = [];
  solicitudes_pendientes: Solicitud[] = [];
  solicitudes_disponibles: Solicitud[] = [];
  loading = false;
  error: string | null = null;

  // Para el modal de fotos
  fotoModalAbierta = false;
  fotoModalUrl: string | null = null;
  fotoModalTitulo: string | null = null;

  // Sidebar para cotización
  sidebarVisible = false;
  sidebarTitle = '';
  componentToLoad: Type<any> | undefined;
  sidebarInputs: any = {};

  // Popup mapa
  popupMapaAbierto = false;
  popupMapaComponente: Type<any> | undefined;
  popupMapaInputs: any = {};

  constructor() {
    // Efecto para escuchar cambios en solicitudes
    effect(() => {
      this.solicitudes = this._solService.solicitudes();
    });
    // Efecto para escuchar cambios en solicitudes_pendientes
    effect(() => {
      this.solicitudes_pendientes = this._solService.solicitudes_pendientes
        ? this._solService.solicitudes_pendientes()
        : [];
      console.log(this.solicitudes_pendientes);
    });
    effect(() => {
      this.solicitudes_disponibles = this._solService.solicitudes_disponibles
        ? this._solService.solicitudes_disponibles()
        : [];
      console.log(this.solicitudes_disponibles);
    });
  }

  async ngOnInit(): Promise<void> {
    this.loading = true;
    try {
      await this._solService.getAllPedidos(); // Solo este método, trae todas
    } catch (err) {
      console.error(err);
      this.error = 'Error cargando solicitudes';
    } finally {
      this.loading = false;
    }
  }

  /**
   * Envía un mensaje al cliente (puede abrir WhatsApp o chat interno)
   */
  enviarMensaje(s: Solicitud): void {
    if (s.cliente && s.cliente.telefono) {
      const mensaje = encodeURIComponent(
        `Hola, soy tu fletero para el pedido #${s.solicitud_id}`,
      );
      const url = `https://wa.me/${s.cliente.telefono}?text=${mensaje}`;
      window.open(url, '_blank');
    } else {
      console.warn('El cliente no tiene teléfono registrado');
    }
  }

  /**
   * Abre el popup del mapa con la ruta de la solicitud
   */
  openMap(solicitud: Solicitud): void {
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
   * Inicia el viaje para una solicitud pendiente
   */
  async realizarViaje(s: Solicitud): Promise<void> {
    this.popupModalService.showSuccess(
      '¿Desea realizar el viaje?',
      'Una vez hecho, al usuario se le notificará que está en camino y se contará el tiempo',
      () => {
        this._solService.solicitudEnViaje(s.solicitud_id);
        console.log('Iniciando viaje para solicitud:', s.solicitud_id);
      },
      () => {
        // OnCancel - Usuario canceló
        console.log('Viaje cancelado');
      },
    );
  }
  /**
   * Completa el viaje de una solicitud en progreso
   */
  async viajeCompletado(s: Solicitud): Promise<void> {
    this.popupModalService.showSuccess(
      '¿Usted desea terminar el viaje?',
      'Una vez hecho, al usuario se le notificará y no podrá modificar',
      () => {
        this._solService.solicitudCompletada(s.solicitud_id);
        console.log('Completando viaje para solicitud:', s.solicitud_id);
      },
      () => {
        // OnCancel - Usuario canceló
        console.log('Completado cancelado');
      },
    );
  }

  /**
   * Obtiene la URL completa de la foto de una solicitud
   */
  obtenerUrlFoto(solicitud: Solicitud): string | null {
    if (!solicitud.foto) {
      return null;
    }
    return this._solicitudFlaskService.obtenerUrlFoto(solicitud.foto);
  }

  /**
   * Verifica si la solicitud tiene foto
   */
  tieneFoto(solicitud: Solicitud): boolean {
    return !!solicitud.foto && solicitud.foto.trim().length > 0;
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
      this.fotoModalTitulo =
        solicitud.detalles_carga || `Foto de pedido #${solicitud.solicitud_id}`;
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

  /**
   * Abre el sidebar para realizar cotización (redirige a detalles)
   */
  realizarCotizacion(solicitud: Solicitud): void {
    console.log('💰 Redirigiendo a realizar cotización:', solicitud);
    this._router.navigate(['/fletero/detalle', solicitud.solicitud_id]);
  }

  /**
   * Handler para los outputs del sidebar
   */
  handleSidebarOutputs(evento: { event: string; data: any }): void {
    console.log('📤 Evento del sidebar:', evento.event, 'Data:', evento.data);
  }
}
