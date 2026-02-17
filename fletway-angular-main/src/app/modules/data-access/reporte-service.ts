import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/data-access/auth-service';
import { Solicitud } from '../../core/layouts/solicitud';

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

    if (!session?.userId || !session.session?.user.email) {
      throw new Error('Usuario no autenticado');
    }

    // ✅ Campos que espera el endpoint /enviar-reporte:
    // usuario_id, solicitud_id, motivo, mensaje
    const payload = {
      usuario_id: session.userId,
      solicitud_id: datos.solicitud_id || null,
      motivo: datos.motivo,
      mensaje: datos.descripcion   // el backend usa 'mensaje' → guarda en 'descripcion'
    };

    return new Promise((resolve, reject) => {
      this._http.post(`${this.apiUrl}/enviar-reporte`, payload).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err)
      });
    });
  }

  async obtenerSolicitudesParaReporte(): Promise<Solicitud[]> {
    const session = this._authService.userState();
    if (!session?.userId) return [];

    const endpoint = session.isFletero
      ? `${this.apiUrl}/mis-viajes-fletero`
      : `${this.apiUrl}/mis-pedidos-cliente`;

    return new Promise((resolve) => {
      this._http.get<any[]>(endpoint).subscribe({
        next: (data) => {
          // ✅ Usamos los nombres exactos del modelo (models.py / _serializar_solicitud):
          //   solicitud_id, detalles_carga, direccion_origen, direccion_destino,
          //   fecha_creacion, estado, localidad_origen, localidad_destino
          const lista: Solicitud[] = data.map(item => ({
            ...item,                                     // pasar todos los campos
            solicitud_id:      item.solicitud_id,
            detalles_carga:    item.detalles_carga   || 'Sin descripción',
            direccion_origen:  item.direccion_origen || 'Origen no especificado',
            direccion_destino: item.direccion_destino || 'Destino no especificado',
            fecha_creacion:    item.fecha_creacion   || null,   // ✅ era item.fecha_hora (incorrecto)
            estado:            item.estado,
            localidad_origen:  item.localidad_origen  || null,
            localidad_destino: item.localidad_destino || null,
            transportista:     item.transportista     || null,
            presupuesto:       item.presupuesto       || null,
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
