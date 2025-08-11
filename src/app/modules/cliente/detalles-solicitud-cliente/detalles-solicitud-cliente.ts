import { Component } from '@angular/core';

@Component({
  selector: 'app-solicitar-flete',
  templateUrl: './solicitar-flete.component.html',
  styleUrls: ['./solicitar-flete.component.scss']
})
export class SolicitarFleteComponent {
  formData = {
    origin: '',
    destination: '',
    pickupDate: '',
    pickupTime: '',
    dimensions: '',
    weight: null as number | null,
    loadPhotos: [] as File[]
  };

  onBack() {
    console.log('Botón "Atrás" presionado. Volviendo a la pantalla anterior.');
    // Aquí podés usar el router para navegar atrás, ej:
    // this.router.navigate(['/ruta-anterior']);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.formData.loadPhotos = Array.from(input.files);
      console.log('Archivos seleccionados:', this.formData.loadPhotos.length);
    }
  }

  onSubmit() {
    console.log('Solicitud de Flete Confirmada:');
    console.log('Origen:', this.formData.origin);
    console.log('Destino:', this.formData.destination);
    console.log('Fecha de Recogida:', this.formData.pickupDate);
    console.log('Hora de Recogida:', this.formData.pickupTime);
    console.log('Dimensiones:', this.formData.dimensions);
    console.log('Peso:', this.formData.weight);
    console.log('Número de Fotos:', this.formData.loadPhotos.length);

    // Aquí iría el envío a backend
  }

  onCancel() {
    console.log('Solicitud de Flete Cancelada. Volviendo a la pantalla anterior.');
    // Podés limpiar el formulario o navegar a otra ruta
  }
}
