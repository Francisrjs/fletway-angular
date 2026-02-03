import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common'; // Importar Location
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReporteService} from '../../modules/data-access/reporte-service'; // Ajusta ruta
import { ToastService } from '../modal/toast/toast.service';
import { Solicitud } from '../../core/layouts/solicitud';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reporte-component.html' // Asegúrate que el nombre del archivo HTML coincida
})
export class ReporteComponent implements OnInit {
  private fb = inject(FormBuilder);
  private reporteService = inject(ReporteService);
  // private solicitudService = inject(SolcitudService); <-- ELIMINADO (No lo necesitamos y tenía typo)
  private toastService = inject(ToastService);
  private location = inject(Location);

  submitting = false;
  loadingData = true;
  listaSolicitudes: Solicitud[] = [];

  form = this.fb.group({
    solicitud_id: ['', [Validators.required]],
    motivo: ['', [Validators.required]],
    descripcion: ['', [Validators.required, Validators.minLength(10)]]
  });

  async ngOnInit() {
    await this.cargarSolicitudes();
  }

  async cargarSolicitudes() {
    try {
      this.loadingData = true;
      // CORRECCIÓN: Usamos reporteService que es donde pusimos la lógica nueva
      this.listaSolicitudes = await this.reporteService.obtenerSolicitudesParaReporte();

      console.log('Viajes cargados:', this.listaSolicitudes); // Debug para ver si llegan
    } catch (error) {
      console.error(error);
      this.toastService.showDanger('Error', 'No se pudieron cargar tus viajes.');
    } finally {
      this.loadingData = false;
    }
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    try {
      const val = this.form.value;

      await this.reporteService.crearReporte({
        motivo: val.motivo!,
        descripcion: val.descripcion!,
        solicitud_id: Number(val.solicitud_id)
      });

      this.toastService.showSuccess('Reporte Enviado', 'El equipo de soporte revisará tu caso.');
      this.cancelar();

    } catch (error: any) {
      console.error(error);
      this.toastService.showDanger('Error', 'Hubo un problema al enviar el reporte.');
    } finally {
      this.submitting = false;
    }
  }

  cancelar() {
    this.location.back();
  }
}