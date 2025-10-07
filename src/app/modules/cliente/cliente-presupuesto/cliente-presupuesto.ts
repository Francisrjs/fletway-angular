import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Presupuesto } from '../../../core/layouts/presupuesto';
import { PresupuestoService } from '../../data-access/presupuesto-service';
import { SolcitudService } from '../../data-access/solicitud-service';
import { PopupModalService } from '../../../shared/modal/popup';

@Component({
  selector: 'app-cliente-presupuesto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cliente-presupuesto.html',
})
export class ClientePresupuesto implements OnInit {
  solicitudId!: number;
  presupuestos: Presupuesto[] = [];
  cargando = false;
  error = '';
  presupuestoSeleccionado: Presupuesto | null = null;
  private presupuestoService = inject(PresupuestoService);
  private solicitudService = inject(SolcitudService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private popupModalService = inject(PopupModalService);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (id) {
        this.solicitudId = id;
        this.cargarPresupuestos();
      }
    });
  }

  //
  async cargarPresupuestos(): Promise<void> {
    this.cargando = true;
    this.error = '';

    try {
      console.log('Cargando presupuestos para solicitudId:', this.solicitudId);
      const data = await this.presupuestoService.getPresupuestosBySolicitudId(
        this.solicitudId,
      );
      console.log('Datos recibidos:', data);
      this.presupuestos = data ?? [];

      // 🔑 Para cada presupuesto, buscar el fletero asociado
      for (const p of this.presupuestos) {
        if (p.transportista_id) {
          console.log('Buscando fletero con ID:', p.transportista_id);
          const fletero = await this.presupuestoService.getFleteroById(
            p.transportista_id,
          );
          console.log('Fletero recibido:', fletero);
          p.transportista = fletero; // lo agregamos al presupuesto
        }
      }
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
            alert('Presupuesto aceptado, pero no se pudo actualizar la solicitud');
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
