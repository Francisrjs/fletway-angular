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
import { ChatComponent } from '../../../shared/features/chat/chat/chat';

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

  // ✅ SIGNALS REACTIVOS DEL SERVICIO
  // Los sockets actualizarán estos signals automáticamente:
  //
  // 1. Socket 'nueva_solicitud' → Agrega a solicitudes_disponibles
  // 2. Socket 'solicitud_actualizada' → Actualiza solicitud existente
  // 3. Socket 'aceptar_solicitud' → Remueve solicitud de otros fleteros
  //    (excepto el ganador que la ve cambiar a 'pendiente')
  // 4. Socket 'presupuesto_aceptado' → El SolicitudService maneja el filtrado
  // 5. Socket 'viaje_iniciado' → Cambia estado a 'en viaje'
  // 6. Socket 'viaje_completado' → Cambia estado a 'completado'
  solicitudes_pendientes = this._solService.solicitudes_pendientes;
  solicitudes_disponibles = this._solService.solicitudes_disponibles;
  loading = this._solService.loading;
  error = this._solService.error;

  // Para el modal de fotos
  fotoModalAbierta = false;
  fotoModalUrl: string | null = null;
  fotoModalTitulo: string | null = null;

  // Popup chat parametros
  popupChatAbierto = false;
  popupChatComponente: Type<any> | undefined;
  popupChatInputs: any = {};

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
    // ✅ EFECTO REACTIVO: Monitoreo de cambios en tiempo real
    effect(() => {
      const disponibles = this.solicitudes_disponibles();
      const pendientes = this.solicitudes_pendientes();

      console.log('🔄 [Fletero-Socket] Estado actualizado:', {
        disponibles: disponibles.length,
        pendientes: pendientes.length,
        total: disponibles.length + pendientes.length
      });

      // 📊 Detalles de cambios
      if (disponibles.length > 0) {
        console.log('   📋 Disponibles:', disponibles.map(s => ({
          id: s.solicitud_id,
          estado: s.estado,
          desde: s.localidad_origen?.nombre,
          hasta: s.localidad_destino?.nombre
        })));
      }

      if (pendientes.length > 0) {
        console.log('   🚚 Pendientes:', pendientes.map(s => ({
          id: s.solicitud_id,
          estado: s.estado,
          desde: s.localidad_origen?.nombre,
          hasta: s.localidad_destino?.nombre
        })));
      }
    });

    // ✅ EFECTO: Detectar cuando una solicitud desaparece (fue aceptada por otro)
    effect(() => {
      const disponibles = this.solicitudes_disponibles();

      // Este effect se ejecutará cada vez que cambie la lista
      // Si una solicitud desaparece, es porque otro fletero fue seleccionado
      console.log('👀 [Fletero] Vigilando cambios en solicitudes disponibles');
    });
  }

  async ngOnInit(): Promise<void> {
    console.log('🚀 [Fletero] Inicializando componente...');

    // ✅ CARGA INICIAL: Solo una vez al inicio
    // Los sockets se encargarán de las actualizaciones posteriores
    try {
      await this._solService.getAllPedidos();
      console.log('✅ [Fletero] Datos iniciales cargados');
      console.log('🔌 [Fletero] Sockets activos - Escuchando eventos en tiempo real');
    } catch (err) {
      console.error('❌ [Fletero] Error cargando datos iniciales:', err);
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
      'Una vez hecho, al usuario se le notificará que está en camino',
      async () => {
        try {
          await this._solService.comenzarViaje(s.solicitud_id);
          console.log('✅ [Fletero] Viaje iniciado:', s.solicitud_id);

          // ✅ El socket 'viaje_iniciado' actualizará el estado automáticamente
          // La solicitud pasará de solicitudes_pendientes a tener estado 'en viaje'
          console.log('🔌 [Socket] Esperando confirmación de viaje_iniciado...');
        } catch (error) {
          console.error('❌ [Fletero] Error al iniciar viaje:', error);
        }
      },
      () => {
        console.log('❌ [Fletero] Viaje cancelado');
      }
    );
  }

  /**
   * Completa el viaje de una solicitud en progreso
   */
  async viajeCompletado(s: Solicitud): Promise<void> {
    this.popupModalService.showSuccess(
      '¿Usted desea terminar el viaje?',
      'Una vez hecho, al usuario se le notificará y no podrá modificar',
      async () => {
        try {
          await this._solService.completarViaje(s.solicitud_id);
          console.log('✅ [Fletero] Viaje completado:', s.solicitud_id);

          // ✅ El socket 'viaje_completado' actualizará el estado automáticamente
          // La solicitud cambiará a estado 'completado'
          console.log('🔌 [Socket] Esperando confirmación de viaje_completado...');
        } catch (error) {
          console.error('❌ [Fletero] Error al completar viaje:', error);
        }
      },
      () => {
        console.log('❌ [Fletero] Completado cancelado');
      }
    );
  }

  /**
   * Cancela la solicitud (solo cuando está pendiente o en viaje)
   */
  async cancelarSolicitud(s: Solicitud): Promise<void> {
    this.popupModalService.showDanger(
      '¿Cancelar solicitud?',
      'El cliente será notificado que no podrás realizar el viaje.',
      async () => {
        try {
          await this._solService.cancelarSolicitudFletero(s.solicitud_id);
          console.log('✅ [Fletero] Solicitud cancelada:', s.solicitud_id);
        } catch (error) {
          console.error('❌ [Fletero] Error al cancelar:', error);
        }
      },
      () => {}
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
   * Abre el chat para una solicitud
   */
  enviarMensaje(solicitud: Solicitud): void {
    console.log('💬 Abriendo chat para solicitud:', solicitud.solicitud_id);

    this.popupChatComponente = ChatComponent;
    this.popupChatInputs = { solicitudId: solicitud.solicitud_id };
    this.popupChatAbierto = true;
  }

  cerrarPopupChat(): void {
    this.popupChatAbierto = false;
    this.popupChatComponente = undefined;
    this.popupChatInputs = {};
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
