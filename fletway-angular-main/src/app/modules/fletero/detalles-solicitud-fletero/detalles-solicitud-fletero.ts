import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, Type } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Solicitud } from '../../../core/layouts/solicitud';
import { MapComponent } from '../../../shared/features/map/map';
import { ToastService } from '../../../shared/modal/toast/toast.service';
import { PresupuestoService } from '../../data-access/presupuesto-service';
import { SolcitudService } from '../../data-access/solicitud-service';
import { SolicitudFlaskService } from '../../data-access/solicitud-flask.service';
import { SidebarComponent } from '../../../shared/features/sidebar';
import { PopupComponent } from '../../../shared/features/popup/popup.component';
import { ChatComponent } from '../../../shared/features/chat/chat/chat';

@Component({
  selector: 'app-detalles-solicitud-fletero',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MapComponent,
    SidebarComponent,
    PopupComponent,
    ChatComponent,
  ],
  templateUrl: './detalles-solicitud-fletero.html',
})
export class DetallesSolicitudFleteroComponent implements OnInit {
  presupuestoForm!: FormGroup;

  pedido: Solicitud | null = null;
  loading = false;
  error = false;

  // Fotos desde Supabase
  fotos: any[] = [];
  cargandoFotos = false;
  fotoSeleccionadaIndex: number | null = null;
  mostrarPopupFoto = false;

  // Presupuesto existente
  presupuestoPropio: any = null;
  modoEdicion = false;

  // Popup del mapa
  popupMapaAbierto = false;
  popupMapaComponente: Type<any> | undefined;
  popupMapaInputs: any = {};

  // popup chat parametros
  popupChatAbierto = false;
  popupChatComponente: Type<any> | undefined;
  popupChatInputs: any = {};

  // Sidebar
  sidebarVisible = false;
  sidebarTitle = '';
  componentToLoad: Type<any> | undefined;
  sidebarInputs: any = {};

  // modelo para el formulario de cotización
  quote = {
    price: null as number | null,
    notes: '' as string,
  };
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private solicitudService = inject(SolcitudService);
  private presupuestoService = inject(PresupuestoService);
  private toastService = inject(ToastService);
  private _solicitudFlaskService = inject(SolicitudFlaskService);
  constructor() {
    this.presupuestoForm = this.fb.group({
      precio: [
        '',
        Validators.compose([Validators.required, Validators.min(1)]),
      ],
      comentario: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      console.warn('No se recibió id en la ruta');
      this.error = true;
      return;
    }

    const id = Number(idParam);
    if (Number.isNaN(id)) {
      console.warn('id de ruta no es numérico:', idParam);
      this.error = true;
      return;
    }

    this.loadPedido(id);
  }

  async loadPedido(id: number) {
    this.loading = true;
    this.error = false;
    let p;
    try {
      // const p = await this.solicitudService.getPedidoById(id);

       p = await this.solicitudService.getPedidoById(id);

      if (!p) {
        console.warn('No se encontró la solicitud con id', id);
        this.pedido = null;
        this.error = true;
        return;
      }
      this.pedido = p;
      // Cargar fotos de la solicitud
      await this.cargarFotos();
      // Verificar si ya tengo un presupuesto para esta solicitud
      await this.verificarPresupuestoExistente();
    } catch (err) {
      console.error('Error cargando pedido:', err);
      this.error = true;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Carga las fotos de la solicitud desde la tabla fotos de Supabase
   */
  async cargarFotos(): Promise<void> {
    if (!this.pedido?.solicitud_id) return;

    this.cargandoFotos = true;
    try {
      this.fotos = await this.solicitudService.getFotosBySolicitudId(
        this.pedido.solicitud_id,
      );
      console.log('📸 Fotos cargadas:', this.fotos);
    } catch (error) {
      console.error('Error cargando fotos:', error);
      this.fotos = [];
    } finally {
      this.cargandoFotos = false;
    }
  }

  /**
   * Verifica si el transportista actual ya envió un presupuesto para esta solicitud
   */
  async verificarPresupuestoExistente(): Promise<void> {
    if (!this.pedido?.solicitud_id) return;

    const transportistaId = this.presupuestoService.sesion.transportista?.transportista_id;
    if (!transportistaId) return;

    try {
      const response = await this.presupuestoService.getPresupuestosBySolicitudId(this.pedido.solicitud_id);
      
      if (!response) return;

      // Buscar si hay uno mío
      const mio = response.find(p => p.transportista_id === transportistaId);
      if (mio) {
        this.presupuestoPropio = mio;
        this.modoEdicion = true;
        this.presupuestoForm.patchValue({
          precio: mio.precio_estimado,
          comentario: mio.comentario
        });
        console.log('💰 Presupuesto propio encontrado:', mio);
      }
    } catch (error) {
      console.error('Error verificando presupuesto existente:', error);
    }
  }

  toggleModoEdicion() {
    if (this.presupuestoPropio) {
      this.modoEdicion = !this.modoEdicion;
      if (!this.modoEdicion) {
         // Reset al valor original si cancela edición
         this.presupuestoForm.patchValue({
          precio: this.presupuestoPropio.precio_estimado,
          comentario: this.presupuestoPropio.comentario
        });
      }
    }
  }

  /**
   * Cancela la cotización y vuelve a la vista anterior
   */
  cancelQuote() {
    this.presupuestoForm.reset();
    this.router.navigate(['/fletero']);
  }

  async submitQuote() {
    if (!this.presupuestoForm.valid || !this.pedido) {
      this.toastService.showWarning(
        'Formulario inválido',
        'Por favor completa todos los campos requeridos',
      );
      return;
    }

    this.loading = true;
    try {
      const v = this.presupuestoForm.value;
      
      if (this.presupuestoPropio) {
        // MODO EDICIÓN
        const result = await this.presupuestoService.editarPresupuesto(
          this.presupuestoPropio.presupuesto_id,
          {
            precio: v.precio,
            comentario: v.comentario
          }
        );

        if (result) {
          this.toastService.showSuccess('¡Éxito!', 'Presupuesto actualizado correctamente');
          this.presupuestoPropio = result;
          this.modoEdicion = false;
        }
      } else {
        // MODO CREACIÓN
        const payload = {
          solicitud: this.pedido.solicitud_id,
          precio: v.precio,
          comentario: v.comentario,
        };
        const result = await this.presupuestoService.addPresupuesto(payload);
        if (result) {
          this.toastService.showSuccess('¡Éxito!', 'Presupuesto enviado correctamente');
          this.router.navigate(['/fletero']);
        }
      }
    } catch (err) {
      console.error('submitQuote catch:', err);
      this.toastService.showDanger('Error', 'Ocurrió un error al procesar el presupuesto');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Verifica si hay fotos disponibles
   */
  tieneFoto(): boolean {
    return this.fotos.length > 0;
  }

  /**
   * Obtiene la foto principal (primera foto)
   */
  get fotoPrincipal(): any | null {
    return this.fotos.length > 0 ? this.fotos[0] : null;
  }

  /**
   * Obtiene las fotos secundarias (resto de fotos)
   */
  get fotosSecundarias(): any[] {
    return this.fotos.slice(1);
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
   * Maneja los outputs del sidebar
   */
  handleSidebarOutputs(evento: { event: string; data: any }): void {
    console.log('📤 Evento del sidebar:', evento.event, 'Data:', evento.data);
    // Manejar eventos del sidebar si es necesario
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
   * Abre el popup del mapa
   */
  verMapa(): void {
    if (!this.pedido) return;

    console.log('🗺️ Abriendo mapa en popup');

    this.popupMapaComponente = MapComponent;
    this.popupMapaInputs = {
      direccionOrigen: this.pedido.direccion_origen,
      ciudadOrigen: this.pedido.localidad_origen?.nombre || '',
      localidadOrigen: this.pedido.localidad_origen?.provincia || '',
      direccionDestino: this.pedido.direccion_destino,
      ciudadDestino: this.pedido.localidad_destino?.nombre || '',
      localidadDestino: this.pedido.localidad_destino?.provincia || '',
    };
    this.popupMapaAbierto = true;
  }

  enviarMensaje(solicitud: Solicitud): void {
    console.log('💬 Abriendo chat para solicitud:', solicitud.solicitud_id);

    // Usar popup para mejor reactividad
    this.popupChatComponente = ChatComponent;
    this.popupChatInputs = { solicitudId: solicitud.solicitud_id };
    this.popupChatAbierto = true;
  }

  cerrarPopupChat(): void {
    this.popupChatAbierto = false;
    this.popupChatComponente = undefined;
    this.popupChatInputs = {};
  }
}
