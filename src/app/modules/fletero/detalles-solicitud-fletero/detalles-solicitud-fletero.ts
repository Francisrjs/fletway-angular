import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-detalles-solicitud-fletero',
  templateUrl: './detalles-solicitud-fletero.html',
  styleUrls: ['./detalles-solicitud-fletero.scss'],
  imports: [CommonModule, FormsModule],
})
export class DetallesSolicitudFleteroComponent {
  quote = {
    price: null as number | null,
    notes: '',
  };

  goBack(): void {
    console.log('Botón "Atrás" presionado. Volviendo al menú del fletero.');
  }

  submitQuote(): void {
    if (this.quote.price != null) {
      console.log('Cotización enviada:');
      console.log('Precio:', this.quote.price, 'ARS');
      console.log('Notas:', this.quote.notes || 'Ninguna');
    } else {
      console.log('Por favor, ingresa un precio para la cotización.');
    }
  }

  cancelQuote(): void {
    console.log('Cotización cancelada. Volviendo a la pantalla anterior.');
  }
}
