import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Solicitud } from '../../../core/layouts/solicitud';
import { SolcitudService } from '../../data-access/solicitud-service';
import { PopupModalService } from '../../../shared/modal/popup';

@Component({
  selector: 'app-fletero',
  templateUrl: './fletero-component.html',
  styleUrls: ['./fletero-component.scss'],
  imports: [CommonModule, RouterLink],
})
export class FleteroComponent implements OnInit {
  private _solService = inject(SolcitudService);
  private popupModalService = inject(PopupModalService);
  solicitudes: Solicitud[] = [];
  solicitudes_pendientes: Solicitud[] = [];
  solicitudes_disponibles: Solicitud[] = [];
  loading = false;
  error: string | null = null;

  constructor() {
    // Efecto para escuchar cambios en solicitudes
    effect(() => {
      this.solicitudes = this._solService.solicitudes();
    });
    // Efecto para escuchar cambios en solicitudes_pendientes
    effect(() => {
      this.solicitudes_pendientes = this._solService.solicitudes_pendientes
        ? this._solService.solicitudes_pendientes()
        : [];
    });
    effect(() => {
      this.solicitudes_disponibles = this._solService.solicitudes_disponibles
        ? this._solService.solicitudes_disponibles()
        : [];
    });
  }

  async ngOnInit(): Promise<void> {
    this.loading = true;
    try {
      await this._solService.getAllPedidos(); // Solo este método, trae todas
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
      case 'en viaje':
        return 'bg-green-400 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm dark:bg-gray-700 dark:text-gray-300';
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
  async realizarViaje(s: Solicitud) {
    this.popupModalService.showSuccess(
      '¿Desea realizar el viaje?',
      'Una vez hecho, al usuario se le notificara que esta en camino y se contara el tiempo',
      () => {
        this._solService.solicitudEnViaje(s.solicitud_id);
        console.log('Eliminando...', s);
      },
      () => {
        // OnCancel - Usuario canceló
        console.log('Cancelado');
      },
    );
  }
  async viajeCompletado(s: Solicitud) {
    this.popupModalService.showSuccess(
      '¿Usted desea terminar el viaje?',
      'Una vez hecho, al usuario se le notificara y no podrá modificzr',
      () => {
        this._solService.solicitudCompletada(s.solicitud_id);
        console.log('Eliminando...', s);
      },
      () => {
        // OnCancel - Usuario canceló
        console.log('Cancelado');
      },
    );
  }
}
