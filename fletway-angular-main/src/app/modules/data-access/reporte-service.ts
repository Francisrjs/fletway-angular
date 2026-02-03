import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/data-access/auth-service';
import {Solicitud} from '../../core/layouts/solicitud';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private _http = inject(HttpClient);
  private _authService = inject(AuthService);

  // Tu API de Flask
  private apiUrl = 'https://fletway-api-533654897399.us-central1.run.app';

  async crearReporte(datos: {
    motivo: string,
    descripcion: string,
    solicitud_id?: number | null
  }) {
    // 1. Obtener datos de sesión para enviarlos al backend
    const session = this._authService.userState();

    if (!session?.userId || !session.session?.user.email) {
      throw new Error('Usuario no autenticado');
    }

    const payload = {
      usuario_id: session.userId, // Enviamos el ID
      email_usuario: session.session.user.email,
      nombre_usuario: session.session.user.user_metadata?.['nombre'] || 'Usuario',
      motivo: datos.motivo,
      mensaje: datos.descripcion, // Nota: en backend usaremos esto para 'descripcion' y para el email
      solicitud_id: datos.solicitud_id || null
    };

    // 2. Enviar TODO al Backend
    // Gracias a tu interceptor, el Token va en los headers automáticamente.
    return new Promise((resolve, reject) => {
      this._http.post(`${this.apiUrl}/enviar-reporte`, payload) // Cambiamos el endpoint a uno más genérico
        .subscribe({
          next: (res) => resolve(res),
          error: (err) => reject(err)
        });
    });
  }

  async obtenerSolicitudesParaReporte(): Promise<Solicitud[]> {
    const session = this._authService.userState();
    if (!session?.userId) return [];

    const isFletero = session.isFletero;
    const userId = session.userId;

    // Endpoint sugerido para tu Backend Flask:
    // Si es fletero: trae viajes donde transportista_id == mi_id
    // Si es cliente: trae viajes donde usuario_id == mi_id AND transportista_id IS NOT NULL
    const endpoint = isFletero
      ? `${this.apiUrl}/mis-viajes-fletero`
      : `${this.apiUrl}/mis-pedidos-cliente`;

    // Nota: Gracias a tu Interceptor, el token va automático, así que el backend
    // puede saber quién eres solo con el token, pero enviamos el ID por si acaso.
    return new Promise((resolve) => {
      this._http.get<any[]>(endpoint).subscribe({
        next: (data) => {
          // Mapeamos para asegurar que coincida con la interfaz
          const lista = data.map(item => ({
            solicitud_id: item.solicitud_id,
            descripcion_carga: item.descripcion || 'Carga sin descripción',
            origen: item.direccion_origen || 'Origen',
            destino: item.direccion_destino || 'Destino',
            fecha: item.fecha_hora || '',
            estado: item.estado
          }));
          resolve(lista);
        },
        error: (err) => {
          console.error("Error cargando solicitudes", err);
          resolve([]); // Retorna vacío si falla para no romper la UI
        }
      });
    });
  }
}