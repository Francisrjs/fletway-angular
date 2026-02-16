import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, Type, ViewChildren, QueryList, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/data-access/auth-service';
import { Solicitud } from '../../../core/layouts/solicitud';
import { SolcitudService } from '../../data-access/solicitud-service';
import { PresupuestoService } from '../../data-access/presupuesto-service';
import { SolicitudFlaskService } from '../../data-access/solicitud-flask.service';
import { SolicitudesListComponent } from '../../../shared/features/solicitudes/solicitudes-list/solicitudes-list.component';
import { SidebarComponent } from '../../../shared/features/sidebar';
import { PopupComponent } from '../../../shared/features/popup/popup.component';
import { ClientePresupuesto } from '../cliente-presupuesto/cliente-presupuesto';
import { PopupModalService } from '../../../shared/modal/popup';
import { MapComponent } from '../../../shared/features/map/map';
import { SolicitudFormComponent } from '../detalles-solicitud-cliente/solicitud';
import { ToastService } from '../../../shared/modal/toast';
import { ChatComponent } from '../../../shared/features/chat/chat/chat';
import { CalificacionService } from '../../data-access/calificacion-service';
import { SolicitudCardComponent } from '../../../shared/features/solicitudes/solicitud-card/solicitud-card.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cliente',
  templateUrl: './cliente-component.html',
  standalone: true,
  imports: [
    CommonModule,
    SolicitudesListComponent,
    FormsModule,
    SidebarComponent,
    PopupComponent,
    SolicitudFormComponent,
  ],
})
export class ClienteComponent implements OnInit {
  private _solService = inject(SolcitudService);
  private _solFlaskService = inject(SolicitudFlaskService);
  private _authService = inject(AuthService);
  private _presupuestoService = inject(PresupuestoService);
  private popupModalService = inject(PopupModalService);
  private toastService = inject(ToastService);
  private _router = inject(Router);
  private _calificacionService = inject(CalificacionService);

  @ViewChildren(SolicitudCardComponent) solicitudCards!: QueryList<SolicitudCardComponent>;

  // ✅ SIGNAL LOCAL PARA LA VISTA
  // Este signal contendrá las solicitudes + datos de calificación + estadísticas
  solicitudesVisuales: WritableSignal<any[]> = signal([]);

  // Signals del servicio base
  loading = this._solService.loading;
  error = this._solService.error;

  // Sidebar parametros
  sidebarVisible = false;
  sidebarTitle = '';
  componentToLoad: Type<any> | undefined;
  sidebarInputs: any = {};

  // Popups
  popupMapaAbierto = false;
  popupMapaComponente: Type<any> | undefined;
  popupMapaInputs: any = {};
  popupChatAbierto = false;
  popupChatComponente: Type<any> | undefined;
  popupChatInputs: any = {};

  // Modales
  fotoModalAbierta = false;
  fotoModalUrl: string | null = null;
  fotoModalTitulo: string | null = null;

  // Calificación
  modalCalificacionAbierto = false;
  solicitudSeleccionada: any = null;
  numerosCalificacion = [1, 2, 3, 4, 5];
  calificacionSeleccionada: number = 0;
  calificacionHover: number | null = null;
  comentarioCalificacion: string = '';

  // ============================================================
  // CACHE LOCAL — Maps planos, NO signals → no causan loops en el effect
  // ============================================================
  private _calificacionData = new Map<number, any>();   // solicitud_id → calificacion
  private _estadisticasData = new Map<number, any>();   // transportista_id → estadisticas

  constructor() {
    // ✅ EFFECT 100% SÍNCRONO — sin HTTP calls, sin loops
    //
    // Lee dos signals: solicitudes + presupuestos
    // Cualquier cambio en uno (incluyendo nuevo_presupuesto por socket) re-ejecuta el effect
    // y actualiza el conteo en cada card automáticamente.
    //
    // Las calificaciones vienen de Maps planos (cargados una sola vez en ngOnInit)
    // → no son signals → no disparan el effect → no hay loop.
    effect(() => {
      const solicitudesRaw = this._solService.solicitudes();
      const presupuestos   = this._presupuestoService.presupuestos();

      const resultados = solicitudesRaw.map(s => ({
        ...s,
        foto: s.foto ? this._solFlaskService.obtenerUrlFoto(s.foto) : null,

        // Reactivo a sockets: cuando llega nuevo_presupuesto, presupuestos() cambia
        // → este effect re-corre → el número en el botón se actualiza solo
        _cantidadPresupuestos: presupuestos.filter(p => p.solicitud_id === s.solicitud_id).length,
        _tienePresupuestos:    presupuestos.some(p => p.solicitud_id === s.solicitud_id),

        // Desde Maps planos (no signals) → no causan re-ejecución del effect
       // _calificacion: this._calificacionData.get(s.solicitud_id) ?? null,
       // _estadisticas: this._estadisticasData.get(
       //   s.presupuesto?.transportista?.transportista_id ?? -1
     //   ) ?? null,
      }));

      this.solicitudesVisuales.set(resultados);
    }, { allowSignalWrites: true });
  }

  async ngOnInit(): Promise<void> {
    console.log('🚀 [Cliente] Inicializando...');
    try {
      // 1. Solicitudes
      await this._solService.getAllPedidosUsuario(false);
      console.log('✅ Solicitudes cargadas');

      // 2. Presupuestos (batch)
      await this._presupuestoService.getPresupuestosCompletoBatch();
      console.log('✅ Presupuestos cargados (batch)');

      // 3. Calificaciones/estadísticas — guardadas en Maps planos, NO en signals → sin loop
     // await this.cargarCalificacionesIniciales();
      console.log('✅ Calificaciones cargadas');

    } catch (err) {
      console.error('❌ [Cliente] Error en init:', err);
    }
  }

  /**
   * Carga calificaciones y estadísticas UNA SOLA VEZ.
   * Las guarda en Maps planos (no signals) para no disparar el effect.
   * Al final fuerza un re-render llamando solicitudesVisuales.set() directamente.
   */
  private async cargarCalificacionesIniciales(): Promise<void> {
    const solicitudes = this._solService.solicitudes();
    if (!solicitudes.length) return;

    await Promise.allSettled(
      solicitudes.map(async s => {
        if (s.estado === 'completado') {
          const cal = await this._calificacionService
            .getCalificacionSolicitud(s.solicitud_id, true)
            .catch(() => null);
          this._calificacionData.set(s.solicitud_id, cal);
        }

        const tid = s.presupuesto?.transportista?.transportista_id;
        if (tid && !this._estadisticasData.has(tid)) {
          const stats = await this._calificacionService
            .getEstadisticasTransportista(tid, true)
            .catch(() => null);
          this._estadisticasData.set(tid, stats);
        }
      })
    );

    // Forzar re-render: ahora los Maps tienen datos → solicitudesVisuales se actualiza
    const solicitudesActuales = this._solService.solicitudes();
    const presupuestos        = this._presupuestoService.presupuestos();

    this.solicitudesVisuales.set(
      solicitudesActuales.map(s => ({
        ...s,
        foto: s.foto ? this._solFlaskService.obtenerUrlFoto(s.foto) : null,
        _cantidadPresupuestos: presupuestos.filter(p => p.solicitud_id === s.solicitud_id).length,
        _tienePresupuestos:    presupuestos.some(p => p.solicitud_id === s.solicitud_id),
        _calificacion: this._calificacionData.get(s.solicitud_id) ?? null,
        _estadisticas: this._estadisticasData.get(
          s.presupuesto?.transportista?.transportista_id ?? -1
        ) ?? null,
      }))
    );
  }

  // ========================================
  // ⭐ LÓGICA DE CALIFICACIÓN (CORE)
  // ========================================

  async onCalificar(solicitud: Solicitud): Promise<void> {
    this.abrirModalCalificacion(solicitud);
  }

  abrirModalCalificacion(solicitud: any): void {
    this.solicitudSeleccionada = solicitud;
    this.calificacionSeleccionada = 0;
    this.calificacionHover = null;
    this.comentarioCalificacion = '';
    this.modalCalificacionAbierto = true;
  }

  cerrarModalCalificacion(): void {
    this.modalCalificacionAbierto = false;
    this.calificacionSeleccionada = 0;
  }

  setHover(valor: number | null): void {
    this.calificacionHover = valor;
  }

  seleccionarCalificacion(valor: number): void {
    this.calificacionSeleccionada = valor;
  }

  /**
   * ✅ ENVÍO DE CALIFICACIÓN
   * Guarda en BD y actualiza localmente sin recargar todo.
   */
  async aceptarCalificacion(): Promise<void> {
    if (!this.solicitudSeleccionada || !this.calificacionSeleccionada) {
      return this.toastService.showDanger('Error', 'Debes seleccionar una puntuación', 3000);
    }

    const solicitud = this.solicitudSeleccionada;
    const transportista = solicitud.presupuesto?.transportista;

    if (!transportista?.transportista_id) return;

    try {
      // 1. Llamada API
      const nuevaCalificacion = await this._calificacionService.crearCalificacion(
        solicitud.solicitud_id,
        transportista.transportista_id,
        this.calificacionSeleccionada,
        this.comentarioCalificacion || ''
      );

      if (!nuevaCalificacion) throw new Error('Error al guardar');

      this.cerrarModalCalificacion();

      // 2. Limpiar cache específico
      this._calificacionService.clearCache(transportista.transportista_id);
      this._calificacionService.clearCalificacionCache(solicitud.solicitud_id);

      // 3. ACTUALIZACIÓN MANUAL REACTIVA (Sin Sockets)
      // Buscamos la solicitud en nuestro array local y le inyectamos la nueva calificación
      this.solicitudesVisuales.update(items => {
        return items.map(item => {
          if (item.solicitud_id === solicitud.solicitud_id) {
            return {
              ...item,
              _calificacion: nuevaCalificacion,
            };
          }
          return item;
        });
      });

      // 4. Refrescar estadísticas del transportista (async)
      this.actualizarEstadisticasLocal(solicitud.solicitud_id, transportista.transportista_id);

      this.toastService.showSuccess('¡Gracias!', `Has calificado con ${this.calificacionSeleccionada} estrellas`, 4000);

    } catch (error: any) {
      console.error(error);
      this.toastService.showDanger('Error', 'No se pudo registrar la calificación', 4000);
    }
  }

  /**
   * Actualiza las estadísticas específicas de un ítem en el array visual
   */
  private async actualizarEstadisticasLocal(solicitudId: number, transportistaId: number) {
    try {
        const nuevasStats = await this._calificacionService.getEstadisticasTransportista(transportistaId, false);

        this.solicitudesVisuales.update(items => items.map(item => {
            if (item.solicitud_id === solicitudId) {
                return { ...item, _estadisticas: nuevasStats };
            }
            return item;
        }));
    } catch (e) {
        console.warn('No se pudieron actualizar las estadísticas visuales inmediatamente');
    }
  }

  // ========================================
  // MÉTODOS AUXILIARES (MAPA, FOTOS, CHAT)
  // ========================================

  abrirFotoModal(solicitud: Solicitud): void {
    const url = (solicitud as any).foto || solicitud.foto;
    if (url) {
      this.fotoModalUrl = url;
      this.fotoModalTitulo = solicitud.detalles_carga || `Foto pedido #${solicitud.solicitud_id}`;
      this.fotoModalAbierta = true;
    }
  }

  cerrarFotoModal(): void {
    this.fotoModalAbierta = false;
    this.fotoModalUrl = null;
  }

  onVerMapa(solicitud: Solicitud): void {
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

  onVerPresupuestos(solicitud: Solicitud): void {
    this.sidebarTitle = 'Presupuestos';
    this.componentToLoad = ClientePresupuesto;
    this.sidebarInputs = { solicitudId: solicitud.solicitud_id };
    this.sidebarVisible = true;
  }

  onCancelarPedido(solicitud: Solicitud): void {
    this.popupModalService.showDanger(
      '¿Desea Cancelar el pedido?',
      'Se eliminará de su lista permanentemente.',
      async () => {
        try {
          await this._solService.cancelarSolicitud(solicitud.solicitud_id);
          this.toastService.showSuccess('Pedido cancelado', 'Correctamente');

          // ✅ El socket 'solicitud_cancelada' actualizará el estado automáticamente
        } catch (error) {
          this.toastService.showDanger('Error', 'No se pudo cancelar');
        }
      }
    );
  }

  enviarMensaje(solicitud: Solicitud): void {
    this.popupChatComponente = ChatComponent;
    this.popupChatInputs = { solicitudId: solicitud.solicitud_id };
    this.popupChatAbierto = true;
  }

  cerrarPopupChat(): void {
    this.popupChatAbierto = false;
    this.popupChatComponente = undefined;
  }

  // ========================================
  // SIDEBAR HANDLERS
  // ========================================

  handleSidebarOutputs(evento: any): void {
    switch (evento.event) {
      case 'onAceptar': this.aceptarPresupuesto(evento.data); break;
      case 'onChatear': this.abrirChatDesdePresupuesto(evento.data); break;
      case 'solicitudCreada': this.onSolicitudCreada(evento.data); break;
      case 'solicitudEditada': this.onSolicitudEditada(evento.data); break;
    }
  }

  closeSidebar(): void { this.sidebarVisible = false; }

  onAgregarPedido(): void {
    this.sidebarTitle = 'Agregar pedido';
    this.componentToLoad = SolicitudFormComponent;
    this.sidebarInputs = { newSolicitud: true };
    this.sidebarVisible = true;
  }

  onSolicitudCreada(solicitud: any): void {
    this.sidebarVisible = false;
    this.popupModalService.showSuccess('Solicitud creada', 'Tu solicitud ha sido creada exitosamente.');

    // ✅ El socket 'nueva_solicitud' actualizará el estado automáticamente
  }

  onEditarSolicitud(solicitud: Solicitud): void {
    this.sidebarTitle = 'Editar pedido';
    this.componentToLoad = SolicitudFormComponent;
    this.sidebarInputs = { editMode: true, solicitud: solicitud };
    this.sidebarVisible = true;
  }

  onSolicitudEditada(solicitud: Solicitud): void {
    this.sidebarVisible = false;
    this.toastService.showSuccess('Solicitud actualizada', 'Correctamente', 3000);

    // ✅ El socket 'solicitud_actualizada' actualizará el estado automáticamente
  }

  abrirChatDesdePresupuesto(data: { solicitudId: number; transportistaId: number; }): void {
    this.sidebarVisible = false;
    this.popupChatComponente = ChatComponent;
    this.popupChatInputs = { solicitudId: data.solicitudId, transportistaId: data.transportistaId };
    this.popupChatAbierto = true;
  }

  /**
   * ✅ ACEPTAR PRESUPUESTO
   *
   * Flujo:
   * 1. Llama a solicitudService.aceptarPresupuesto()
   * 2. Backend emite 'aceptar_solicitud' → Actualiza SolicitudService
   * 3. Backend también actualiza presupuestos → PresupuestoService se actualiza
   * 4. Los effects reaccionan a los cambios
   * 5. La UI se actualiza automáticamente
   */
  async aceptarPresupuesto(presupuesto: any): Promise<void> {
    this.popupModalService.showSuccess(
      '¿Aceptar presupuesto?',
      'El transportista será notificado.',
      async () => {
        try {
          console.log('✅ [Cliente] Aceptando presupuesto:', presupuesto.presupuesto_id);

          await this._presupuestoService.aceptarPresupuesto(presupuesto.presupuesto_id, presupuesto.solicitud_id);

          // ✅ REACTIVIDAD AUTOMÁTICA:
          // 1. Socket 'aceptar_solicitud' → SolicitudService actualiza solicitud
          // 2. Socket también actualiza presupuestos en PresupuestoService
          // 3. Effect en este componente procesa la solicitud actualizada
          // 4. solicitudesVisuales se actualiza con transportista asignado
          // 5. ClientePresupuesto reactúa a cambios en PresupuestoService
          // 6. UI se actualiza automáticamente en ambas vistas

          this.sidebarVisible = false;
          this.toastService.showSuccess('Presupuesto aceptado', 'Transportista notificado');

          console.log('🔌 [Socket] Esperando actualizaciones automáticas...');
          console.log('   - Solicitud cambiará a estado "pendiente"');
          console.log('   - Transportista asignado se mostrará en la card');
          console.log('   - Otros presupuestos se removerán de la vista');

        } catch (error) {
          console.error('❌ [Cliente] Error al aceptar presupuesto:', error);
          this.toastService.showDanger('Error', 'No se pudo aceptar');
        }
      }
    );
  }

}
