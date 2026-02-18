import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  Input,
  Output,
  EventEmitter,
  effect,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Presupuesto } from '../../../core/layouts/presupuesto';
import { PresupuestoService } from '../../data-access/presupuesto-service';
import { SolcitudService } from '../../data-access/solicitud-service';
import { PopupModalService } from '../../../shared/modal/popup';
import { Solicitud } from '../../../core/layouts/solicitud';

@Component({
  selector: 'app-cliente-presupuesto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cliente-presupuesto.html',
})
export class ClientePresupuesto implements OnInit {
  @Input() solicitudId!: number;
  @Output() onAceptar = new EventEmitter<Presupuesto>();
  @Output() onChatear = new EventEmitter<{
    solicitudId: number;
    transportistaId: number;
  }>();

  private presupuestoService = inject(PresupuestoService);
  private solicitudService = inject(SolcitudService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private popupModalService = inject(PopupModalService);

  // ✅ SIGNALS LOCALES
  private _solicitudIdSignal = signal<number | null>(null);
  presupuestoSeleccionado = signal<Presupuesto | null>(null);
  cargando = signal(false);
  errorMsg = signal('');
  fechaActual = new Date();

  // ✅ COMPUTED: Presupuestos filtrados por solicitud actual
  presupuestosDeLaSolicitud = computed(() => {
    const solicitudId = this._solicitudIdSignal();
    if (!solicitudId) return [];

    return this.presupuestoService.presupuestos().filter(
      p => p.solicitud_id === solicitudId
    );
  });

  // ✅ COMPUTED: Presupuestos a mostrar (solo aceptado O solo pendientes)
  presupuestosMostrar = computed(() => {
    const todos = this.presupuestosDeLaSolicitud();

    // Si hay aceptado, mostrar SOLO ese
    const aceptados = todos.filter(p => p.estado === 'aceptado');
    if (aceptados.length > 0) {
      return aceptados;
    }

    // Si no hay aceptado, mostrar pendientes
    return todos.filter(p => p.estado === 'pendiente');
  });

  // ✅ COMPUTED: Información de estado
  hayPresupuestoAceptado = computed(() => {
    const todos = this.presupuestosDeLaSolicitud();
    return todos.some(p => p.estado === 'aceptado');
  });

  modoVisualizacion = computed(() => {
    return this.hayPresupuestoAceptado() ? 'aceptado' : 'pendientes';
  });

  conteoPresupuestos = computed(() => {
    const todos = this.presupuestosDeLaSolicitud();
    return {
      total: todos.length,
      pendientes: todos.filter(p => p.estado === 'pendiente').length,
      aceptados: todos.filter(p => p.estado === 'aceptado').length,
      rechazados: todos.filter(p => p.estado === 'rechazado').length,
    };
  });

  // ✅ SIGNALS DEL SERVICIO
  loading = this.presupuestoService.loading;
  error = this.presupuestoService.error;

  constructor() {
    // ✅ EFECTO: Actualizar presupuesto seleccionado cuando cambian los presupuestos
    effect(() => {
      const presupuestos = this.presupuestosMostrar();

      if (presupuestos.length > 0) {
        // Mantener selección si existe, sino seleccionar el primero
        const actual = this.presupuestoSeleccionado();
        const existe = presupuestos.find(p => p.presupuesto_id === actual?.presupuesto_id);

        if (existe) {
          // Actualizar con la versión más reciente
          this.presupuestoSeleccionado.set(existe);
        } else {
          // Seleccionar el primero
          this.presupuestoSeleccionado.set(presupuestos[0]);
        }
      } else {
        this.presupuestoSeleccionado.set(null);
      }

      console.log('📊 [Presupuestos] Actualizados:', {
        total: presupuestos.length,
        modo: this.modoVisualizacion(),
        seleccionado: this.presupuestoSeleccionado()?.presupuesto_id
      });
    }, { allowSignalWrites: true });

    // ✅ EFECTO: Log de cambios en presupuestos (DEBUG)
    effect(() => {
      const presupuestos = this.presupuestosDeLaSolicitud();
      console.log('🔄 [Socket-Presupuestos] Cambio detectado:', {
        solicitudId: this._solicitudIdSignal(),
        count: presupuestos.length,
        estados: {
          pendientes: presupuestos.filter(p => p.estado === 'pendiente').length,
          aceptados: presupuestos.filter(p => p.estado === 'aceptado').length,
          rechazados: presupuestos.filter(p => p.estado === 'rechazado').length,
        }
      });
    });
  }

  ngOnInit(): void {
    console.log('ClientePresupuesto ngOnInit - solicitudId:', this.solicitudId);

    // Si se usa como componente dinámico, solicitudId viene del @Input
    if (this.solicitudId) {
      this._solicitudIdSignal.set(this.solicitudId);
      this.cargarPresupuestos();
    } else {
      // Si se usa como ruta, obtener de route params
      this.route.paramMap.subscribe((params) => {
        const id = Number(params.get('id'));
        if (id) {
          this.solicitudId = id;
          this._solicitudIdSignal.set(id);
          this.cargarPresupuestos();
        }
      });
    }
  }

async cargarPresupuestos(): Promise<void> {
    const solicitudId = this._solicitudIdSignal();
    if (!solicitudId) return;

    // Si el batch ya cargó presupuestos para esta solicitud, no hacer nada.
    // Los computed ya tienen los datos → la UI se renderiza instantáneamente.
    const yaEnMemoria = this.presupuestoService.presupuestos()
      .some(p => p.solicitud_id === solicitudId);

    if (yaEnMemoria) {
      console.log('⚡ [ClientePresupuesto] Datos ya en memoria, sin HTTP call');
      const presupuestos = this.presupuestoService.presupuestos()
      .filter(p => p.solicitud_id === solicitudId);

    console.log('Presupuestos encontrados:', presupuestos);

    presupuestos.forEach(p => {
      console.log('Transportista:', p.transportista);
    });
      return;
    }

    // Fallback: solo si el batch no corrió aún o falló
   /* console.log('📡 [ClientePresupuesto] Datos no en memoria, cargando...');
    this.cargando.set(true);
    try {
      await this.presupuestoService.getPresupuestosBySolicitudId(solicitudId);
    } catch (err) {
      console.error('❌ Error cargando presupuestos:', err);
      this.errorMsg.set('No se pudieron cargar los presupuestos.');
    } finally {
      this.cargando.set(false);
    }*/
  }

  /**
   * 🎨 Obtener clase CSS según el estado del presupuesto
   */
  obtenerClaseEstado(estado: string): string {
    switch (estado) {
      case 'aceptado':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'rechazado':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  /**
   * 🏷️ Obtener texto del badge según el estado
   */
  obtenerTextoBadge(estado: string): string {
    switch (estado) {
      case 'aceptado':
        return '✓ Aceptado';
      case 'pendiente':
        return '⏳ Pendiente';
      case 'rechazado':
        return '✕ Rechazado';
      default:
        return estado;
    }
  }

  /**
   * ✅ Aceptar presupuesto con confirmación
   */
  async onAceptarClick(presupuesto: Presupuesto): Promise<void> {
    console.log('✅ Aceptando presupuesto:', presupuesto.presupuesto_id);

    // Emitir al componente padre
    this.onAceptar.emit(presupuesto);

    // ⚠️ NO necesitamos recargar manualmente
    // El socket 'aceptar_solicitud' actualizará el servicio automáticamente
    // Y nuestros computed reaccionarán a ese cambio
  }

  /**
   * ❌ Rechazar presupuesto con confirmación
   */
  async onRechazar(p: Presupuesto): Promise<void> {
    this.popupModalService.showDanger(
      '¿Rechazar presupuesto?',
      'Esta acción rechazará el presupuesto del transportista. Esta acción no se puede deshacer.',
      async () => {
        try {
          const ok = await this.presupuestoService.rechazarPresupuesto(
            p.presupuesto_id,
            p.solicitud_id,
          );

          if (ok) {
            console.log('✅ Presupuesto rechazado exitosamente');
            // ✅ El servicio ya actualizó su estado local
            // Los computed reaccionarán automáticamente
          } else {
            console.error('❌ Error al rechazar presupuesto');
            alert('Error al rechazar presupuesto');
          }
        } catch (error) {
          console.error('❌ Excepción al rechazar:', error);
          alert('Error al rechazar presupuesto');
        }
      },
      () => {
        console.log('❌ Usuario canceló el rechazo');
      },
    );
  }

  /**
   * 💬 Chatear con transportista
   */
  onChatearClick(presupuesto: Presupuesto): void {
    console.log(
      '💬 Iniciando chat con transportista:',
      presupuesto.transportista_id,
    );
    if (presupuesto.transportista_id) {
      this.onChatear.emit({
        solicitudId: this.solicitudId,
        transportistaId: presupuesto.transportista_id,
      });
    }
  }

  getEstrellasPromedio(promedio: number | null | undefined): boolean[] {
    if (promedio == null) return [];

    const entero = Math.round(promedio);
    return Array.from({ length: 5 }, (_, i) => i < entero);
  }

}
