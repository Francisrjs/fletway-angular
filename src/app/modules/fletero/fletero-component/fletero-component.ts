import { Component, OnInit, Pipe, inject } from '@angular/core';
import { Solicitud } from '../../../core/layouts/solicitud';
import { SolcitudService } from '../../data-access/solicitud-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fletero',
  templateUrl: './fletero-component.html',
  styleUrls: ['./fletero-component.scss'],
  imports: [CommonModule],
})
export class FleteroComponent implements OnInit {
  constructor() {}

  private _solService = inject(SolcitudService);

  solicitudes: Solicitud[] = [];
  solicitudes_pendientes: Solicitud[] = [];
  loading = false;
  error: string | null = null;

  async ngOnInit(): Promise<void> {
    this.loading = true;
    try {
      const data = await this._solService.getAllPedidosDisponibles();
      const dataPendiente = await this._solService.getAllPedidosPendientes();
      if (data) {
        // CÓDIGO CORRECTO
        this.solicitudes = data ?? []; // Si data es null, se asigna un array vacío.
        this.solicitudes_pendientes = dataPendiente ?? []; // Lo mismo para dataPendiente.
      } else {
        this.solicitudes = [];
        this.solicitudes_pendientes = [];
      }
    } catch (err) {
      console.error(err);
      this.error = 'Error cargando solicitudes';
    } finally {
      this.loading = false;
    }
  }

  // Devuelve clase para badge según estado
  badgeClass(estado: string | null | undefined) {
    switch ((estado || '').toLowerCase()) {
      case 'completado':
      case 'entregado':
        return 'bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-sm dark:bg-green-900 dark:text-green-300';
      case 'en camino':
        return 'bg-yellow-100 text-yellow-800 text-xs font-medium px-3.5 py-0.5 rounded-sm dark:bg-yellow-900 dark:text-yellow-300';
      case 'sin transportista':
        return 'bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm dark:bg-gray-700 dark:text-gray-300';
      case 'pendiente':
      default:
        return 'bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-sm dark:bg-blue-900 dark:text-blue-300';
    }
  }

  // Abrir Google Maps con la dirección (origen ó destino)
  openMap(s: Solicitud, useOrigen = true) {
    const direccion = useOrigen ? s.direccion_origen : s.direccion_destino;
    const localidad = s.localidad_origen?.nombre ?? '';
    const query = encodeURIComponent(`${direccion} ${localidad}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  }
}
