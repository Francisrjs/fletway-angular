import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  Validators,
} from '@angular/forms';
import { Solicitud } from '../../../core/layouts/solicitud';
import { ActivatedRoute, Router } from '@angular/router';
import { SolcitudService } from '../../data-access/solicitud-service';
import { Map } from '../../../shared/features/map/map';
import { PresupuestoService } from '../../data-access/presupuesto-service';

@Component({
  selector: 'app-detalles-solicitud-fletero',
  standalone: true,
  imports: [CommonModule, FormsModule, Map],
  templateUrl: './detalles-solicitud-fletero.html',
})
export class DetallesSolicitudFleteroComponent implements OnInit {
  presupuestoForm!: FormGroup;

  pedido: Solicitud | null = null;
  loading = false;
  error = false;

  // modelo para el formulario de cotización
  quote = {
    price: null as number | null,
    notes: '' as string,
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private solicitudService: SolcitudService,
    private presupuestoService: PresupuestoService,
  ) {
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
      alert('Formulario inválido o pedido no cargado');
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
        alert('Error al enviar el presupuesto.');
        this.error = true;
        return;
      }
      alert('Presupuesto enviado correctamente.');
      this.router.navigate(['/fletero']);
    } catch (err) {
      console.error('submitQuote catch:', err);
      alert('Error inesperado al enviar el presupuesto.');
      this.error = true;
    } finally {
      this.loading = false;
    }
  }
}
