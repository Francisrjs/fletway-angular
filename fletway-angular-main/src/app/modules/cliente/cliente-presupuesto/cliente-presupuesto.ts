import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, Input } from '@angular/core';
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
  @Input() solicitudId!: number; // Input desde el sidebar
  presupuestos: Presupuesto[] = [];
  cargando = false;
  error = '';
  presupuestoSeleccionado: Presupuesto | null = null;
  hayPresupuestoAceptado = false;
  fechaActual = new Date();
  private presupuestoService = inject(PresupuestoService);
  private solicitudService = inject(SolcitudService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private popupModalService = inject(PopupModalService);

  ngOnInit(): void {
    console.log('ClientePresupuesto ngOnInit - solicitudId:', this.solicitudId);

    // Si se usa como componente dinámico, solicitudId viene del @Input
    if (this.solicitudId) {
      this.cargarPresupuestos();
    } else {
      // Si se usa como ruta, obtener de route params
      this.route.paramMap.subscribe((params) => {
        const id = Number(params.get('id'));
        if (id) {
          this.solicitudId = id;
          this.cargarPresupuestos();
        }
      });
    }
  }

  //
  async cargarPresupuestos(): Promise<void> {
    this.cargando = true;
    this.error = '';

    console.log('🔍 Cargando presupuestos para solicitudId:', this.solicitudId);

    if (!this.solicitudId) {
      console.error('❌ No hay solicitudId definido');
      this.error = 'No se especificó la solicitud';
      this.cargando = false;
      return;
    }

    try {
      console.log('📡 Haciendo petición a la BD...');
      const data = await this.presupuestoService.getPresupuestosBySolicitudId(
        this.solicitudId,
      );
      const todos = Array.isArray(data) ? data : [];
      console.log('Total presupuestos en DB:', todos.length);

      const aceptados = todos.filter((p) => p.estado === 'aceptado');
      const pendientes = todos.filter((p) => p.estado === 'pendiente');

      let aMostrar = aceptados.length > 0 ? aceptados : pendientes;
      console.log(
        'Mostrando:',
        aceptados.length > 0 ? 'ACEPTADOS' : 'PENDIENTES',
        '— cantidad:',
        aMostrar.length,
      );

      if (aMostrar.length > 0) {
        aMostrar = await Promise.all(
          aMostrar.map(async (p) => {
            if (!p.transportista_id) return p;
            try {
              const fletero = await this.presupuestoService.getFleteroById(
                p.transportista_id,
              );
              return { ...p, transportista: fletero };
            } catch (e) {
              console.warn(
                'No se pudo cargar fletero para',
                p.presupuesto_id,
                e,
              );
              return p;
            }
          }),
        );
      }
      this.presupuestos = aMostrar;
      this.presupuestoSeleccionado = this.presupuestos[0] ?? null;
      this.hayPresupuestoAceptado = this.presupuestos.some(
        (p) => p.estado === 'aceptado',
      );
    } catch (err) {
      console.error(err);
      this.error = 'No se pudieron cargar los presupuestos.';
    } finally {
      this.cargando = false;
    }
  }

  //
  async onAceptar(presupuesto: Presupuesto) {
    this.popupModalService.showSuccess(
      '¿Aceptar presupuesto?',
      'Confirma que deseas aceptar este presupuesto. Una vez aceptado, el transportista será notificado.',
      async () => {
        // Función onAccept
        const ok = await this.presupuestoService.aceptarPresupuesto(
          presupuesto.presupuesto_id,
          presupuesto.solicitud_id,
        );

        if (ok) {
          // ahora actualizamos la solicitud con el presupuesto aceptado
          const okSolicitud =
            await this.solicitudService.actualizarSolicitudConPresupuesto(
              presupuesto.solicitud_id,
              presupuesto.presupuesto_id,
            );

          if (okSolicitud) {
            this.router.navigate(['/cliente']);
          } else {
            alert(
              'Presupuesto aceptado, pero no se pudo actualizar la solicitud',
            );
          }
        } else {
          alert('Error al aceptar presupuesto');
        }
      },
      () => {
        // Función onCancel
        console.log('Usuario canceló la aceptación');
      },
    );
  }

  async onRechazar(p: Presupuesto) {
    this.popupModalService.showDanger(
      '¿Rechazar presupuesto?',
      'Esta acción rechazará el presupuesto del transportista. Esta acción no se puede deshacer.',
      async () => {
        // Función onAccept
        const ok = await this.presupuestoService.rechazarPresupuesto(
          p.presupuesto_id,
          p.solicitud_id,
        );
        if (ok) {
          this.router.navigate(['/cliente']);
        } else {
          alert('Error al rechazar presupuesto');
        }
      },
      () => {
        // Función onCancel
        console.log('Usuario canceló el rechazo');
      },
    );
  }
}
