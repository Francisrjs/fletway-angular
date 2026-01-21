import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Solicitud } from '../../../core/layouts/solicitud';
import { MapComponent } from '../../../shared/features/map/map';
import { ToastService } from '../../../shared/modal/toast/toast.service';
import { PresupuestoService } from '../../data-access/presupuesto-service';
import { SolcitudService } from '../../data-access/solicitud-service';
import { SolicitudFlaskService } from '../../data-access/solicitud-flask.service';

@Component({
  selector: 'app-detalles-solicitud-fletero',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MapComponent],
  templateUrl: './detalles-solicitud-fletero.html',
})
export class DetallesSolicitudFleteroComponent implements OnInit {
  presupuestoForm!: FormGroup;

  pedido: Solicitud | null = null;
  loading = false;
  error = false;

  // Para el modal de fotos
  fotoModalAbierta = false;
  fotoModalUrl: string | null = null;
  fotoModalTitulo: string | null = null;

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
    try {
      const p = await this.solicitudService.getPedidoById(id);
      if (!p) {
        console.warn('No se encontró la solicitud con id', id);
        this.pedido = null;
        this.error = true;
        return;
      }
      this.pedido = p;
    } catch (err) {
      console.error('Error cargando pedido:', err);
      this.error = true;
    } finally {
      this.loading = false;
    }
  }

  cancelQuote() {
    this.quote = { price: null, notes: '' };
  }

  async submitQuote() {
    if (!this.presupuestoForm.valid || !this.pedido) {
      console.log(this.presupuestoForm.value);
      this.toastService.showWarning(
        'Formulario inválido',
        'Por favor completa todos los campos requeridos',
      );
      return;
    }

    this.loading = true;
    this.error = false;
    try {
      const v = this.presupuestoForm.value;
      const payload = {
        solicitud: this.pedido.solicitud_id,
        precio: v.precio,
        comentario: v.comentario,
      };
      const result = await this.presupuestoService.addPresupuesto(payload);
      if (!result) {
        this.toastService.showDanger(
          'Error',
          'No se pudo enviar el presupuesto',
        );
        this.error = true;
        return;
      }
      this.toastService.showSuccess(
        '¡Éxito!',
        'Presupuesto enviado correctamente',
      );
      this.router.navigate(['/fletero']);
    } catch (err) {
      console.error('submitQuote catch:', err);
      this.toastService.showDanger(
        'Error inesperado',
        'Ocurrió un error al enviar el presupuesto',
      );
      this.error = true;
    } finally {
      this.loading = false;
    }
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
}
