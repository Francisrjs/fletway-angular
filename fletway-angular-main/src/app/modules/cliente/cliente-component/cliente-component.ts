import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, Type } from '@angular/core';
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

@Component({
  selector: 'app-cliente',
  templateUrl: './cliente-component.html',
  standalone: true,
  imports: [
    CommonModule,
    SolicitudesListComponent,
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

  //sidebar parametros
  sidebarVisible = false;
  sidebarTitle = '';
  componentToLoad: Type<any> | undefined;
  sidebarInputs: any = {};

  // popup mapa parametros
  popupMapaAbierto = false;
  popupMapaComponente: Type<any> | undefined;
  popupMapaInputs: any = {};

  solicitudes: Solicitud[] = this._solService.solicitudes();

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

  constructor() {
    // Effect para escuchar cambios en la señal de solicitudes
    effect(() => {
      this.solicitudes = this._solService.solicitudes();
      console.log('📋 Solicitudes actualizadas:', this.solicitudes);
    });
  }

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

      console.log('👤 Usuario:', this._authService.session());

      await Promise.all([this.anotarResumenesPresupuestos(this.solicitudes)]);

      this.solicitudes = this.mapearConFotoUrl(this.solicitudes);
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
    return this._solFlaskService.obtenerUrlFoto(solicitud.foto);
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

  onVerMapa(solicitud: Solicitud) {
    this.verMapa(solicitud);
  }

  onVerPresupuestos(solicitud: Solicitud): void {
    // this._router.navigate([
    //   '/cliente/detallePresupuesto',
    //   solicitud.solicitud_id,
    // ]);
    this.verPresupuestos(solicitud);
  }

  onCancelarPedido(solicitud: Solicitud): void {
    console.log('🗑️ Cancelar pedido:', solicitud.solicitud_id);
    this.popupModalService.showDanger(
      '¿Desea Cancelar  el pedido?',
      'Una vez cancelado, el pedido no podrá ser aceptado ni rechazado y se eliminará de su lista',
      async () => {
        try {
          await this._solService.eliminarSolicitud(solicitud.solicitud_id);
          this.toastService.showSuccess(
            'Pedido cancelado',
            'El pedido ha sido cancelado correctamente',
          );
        } catch (error) {
          this.toastService.showDanger(
            'Error al cancelar el pedido',
            'No se pudo cancelar el pedido  ' + error,
          );
        }
      },
      () => {
        // OnCancel - Usuario canceló
        console.log('Viaje cancelado');
      },
    );
  }

  enviarMensaje(solicitud: Solicitud): void {
    console.log('Enviar mensaje:', solicitud.solicitud_id);
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

  //sidebars callouts
  // Capturar TODOS los outputs
  handleSidebarOutputs(evento: { event: string; data: any }): void {
    console.log('📤 Evento del sidebar:', evento.event, 'Data:', evento.data);

    switch (evento.event) {
      case 'onAceptar':
        this.aceptarPresupuesto(evento.data);
        this.sidebarVisible = false;
        break;
      case 'solicitudCreada':
        this.onSolicitudCreada(evento.data);
        break;
      case 'onCancel':
        this.closeSidebar();
        break;
      default:
        console.log('Evento no manejado:', evento.event);
    }
  }

  closeSidebar(): void {
    this.sidebarVisible = false;
  }

  onAgregarPedido(): void {
    this.sidebarTitle = 'Agregar pedido';
    this.componentToLoad = SolicitudFormComponent;
    this.sidebarInputs = {
      newSolicitud: true,
    };
    this.sidebarVisible = true;
  }

  onSolicitudCreada(solicitud: any): void {
    console.log('✅ Solicitud creada:', solicitud);
    // Cerrar el sidebar
    this.sidebarVisible = false;
    // Recargar las solicitudes
    this.ngOnInit();
    // Mostrar mensaje de éxito
    this.popupModalService.showSuccess(
      'Solicitud creada',
      'Tu solicitud ha sido creada exitosamente.',
      () => {},
    );
  }
  verPresupuestos(solicitud: Solicitud): void {
    this.sidebarTitle = 'Presupuestos';
    this.componentToLoad = ClientePresupuesto;
    this.sidebarInputs = { solicitudId: solicitud.solicitud_id };
    this.sidebarVisible = true;
  }
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
  async aceptarPresupuesto(presupuesto: any): Promise<void> {
    console.log('✅ Aceptando presupuesto:', presupuesto);

    this.popupModalService.showSuccess(
      '¿Aceptar presupuesto?',
      'Confirma que deseas aceptar este presupuesto. Una vez aceptado, el transportista será notificado.',
      async () => {
        try {
          const ok = await this._presupuestoService.aceptarPresupuesto(
            presupuesto.presupuesto_id,
            presupuesto.solicitud_id,
          );

          if (ok) {
            const okSolicitud =
              await this._solService.actualizarSolicitudConPresupuesto(
                presupuesto.solicitud_id,
                presupuesto.presupuesto_id,
              );

            if (okSolicitud) {
              console.log('✅ Presupuesto aceptado y solicitud actualizada');
              // Recargar solicitudes
              await this.ngOnInit();
            } else {
              alert(
                'Presupuesto aceptado, pero no se pudo actualizar la solicitud',
              );
            }
          } else {
            alert('Error al aceptar presupuesto');
          }
        } catch (error) {
          console.error('❌ Error aceptando presupuesto:', error);
          alert('Error al aceptar presupuesto');
        }
      },
      () => {
        console.log('❌ Usuario canceló la aceptación');
      },
    );
  }
}
