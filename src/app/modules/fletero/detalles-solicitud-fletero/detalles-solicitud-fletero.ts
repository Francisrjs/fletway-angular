import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Solicitud } from '../../../core/layouts/solicitud';
import { ActivatedRoute, Router } from '@angular/router';
import { SolcitudService } from '../../data-access/solicitud-service';
@Component({
  selector: 'app-detalles-solicitud-fletero',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './detalles-solicitud-fletero.html',
})
export class DetallesSolicitudFleteroComponent implements OnInit {
  pedido: Solicitud | null = null;
  loading = false;
  error = false;

  // modelo para el formulario de cotización
  quote = {
    price: null as number | null,
    notes: '' as string,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private solicitudService: SolcitudService,
  ) {}

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
    if (!this.pedido) return;
    if (!this.quote.price) {
      alert('Ingresá un precio válido');
      return;
    }

    // Aquí podés llamar al service que considere tu lógica de "enviar cotización".
    // Por ahora dejamos un console.log y podés reemplazar con la llamada real.
    console.log(
      'Enviar cotización para solicitud',
      this.pedido.solicitud_id,
      this.quote,
    );

    // EJEMPLO: si implementarás un método en SolcitudService que inserte una cotización:
    // await this.solicitudService.enviarCotizacion(this.pedido.solicitud_id, { precio: this.quote.price, notas: this.quote.notes });

    alert(
      'Cotización enviada (sólo demo). Implementá enviarCotizacion en el service si querés persistir.',
    );
    this.cancelQuote();
  }
}
