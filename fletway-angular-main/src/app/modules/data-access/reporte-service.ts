import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/data-access/auth-service';

// Solo los 4 campos que necesita el formulario de reporte
export interface SolicitudResumen {
  solicitud_id: number;
  detalles_carga: string;
  fecha_creacion: string | null;
  estado: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private _http = inject(HttpClient);
  private _authService = inject(AuthService);

  private apiUrl = 'https://fletway-api-533654897399.us-central1.run.app';

  async crearReporte(datos: {
    motivo: string;
    descripcion: string;
    solicitud_id?: number | null;
  }) {
    const session = this._authService.userState();
    if (!session?.userId) throw new Error('Usuario no autenticado');

    const payload = {
      usuario_id: session.userId,
      solicitud_id: datos.solicitud_id || null,
      motivo: datos.motivo,
      mensaje: datos.descripcion
    };

    return new Promise((resolve, reject) => {
      this._http.post(`${this.apiUrl}/enviar-reporte`, payload).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err)
      });
    });
  }

  async obtenerSolicitudesParaReporte(): Promise<SolicitudResumen[]> {
    const session = this._authService.userState();
    if (!session?.userId) return [];

    const endpoint = session.isFletero
      ? `${this.apiUrl}/mis-viajes-fletero`
      : `${this.apiUrl}/mis-pedidos-cliente`;

    return new Promise((resolve) => {
      this._http.get<any[]>(endpoint).subscribe({
        next: (data) => {
          // Solo los 4 campos que usa el formulario
          const lista: SolicitudResumen[] = data.map(item => ({
            solicitud_id:   item.solicitud_id,
            detalles_carga: item.detalles_carga || 'Sin descripción',
            fecha_creacion: item.fecha_creacion || null,
            estado:         item.estado
          }));
          resolve(lista);
        },
        error: (err) => {
          console.error('Error cargando solicitudes para reporte:', err);
          resolve([]);
        }
      });
    });
  }
}
