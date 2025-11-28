import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Interfaces para tipar las respuestas
interface SolicitudFlask {
  solicitud_id: number;
  cliente_id: number;
  localidad_origen_id: number;
  localidad_destino_id: number | null;
  direccion_origen: string;
  direccion_destino: string;
  detalles_carga: string;
  medidas: string | null;
  peso: number | null;
  fecha_creacion: string;
  hora_recogida: string | null;
  estado: string;
  presupuesto_aceptado: number | null;
  foto: string | null;
}

interface RespuestaSubidaFoto {
  mensaje: string;
  foto: string;
  solicitud: SolicitudFlask;
}

@Injectable({
  providedIn: 'root',
})
export class SolicitudFlaskService {
  private http = inject(HttpClient);

  // URL base de tu API Flask
  private readonly apiUrl = 'http://127.0.0.1:5000';

  // Tamaño máximo de archivo (5MB)
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;

  // Extensiones permitidas
  private readonly ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

  /**
   * Obtiene todas las solicitudes
   */
  obtenerSolicitudes(): Observable<SolicitudFlask[]> {
    return this.http
      .get<SolicitudFlask[]>(`${this.apiUrl}/solicitudes`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtiene una solicitud por ID
   */
  obtenerSolicitudPorId(id: number): Observable<SolicitudFlask> {
    return this.http
      .get<SolicitudFlask>(`${this.apiUrl}/solicitudes/${id}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Crea una nueva solicitud
   */
  crearSolicitud(
    solicitud: Partial<SolicitudFlask>,
  ): Observable<SolicitudFlask> {
    return this.http
      .post<SolicitudFlask>(`${this.apiUrl}/solicitudes`, solicitud)
      .pipe(catchError(this.handleError));
  }

  /**
   * Actualiza una solicitud existente
   */
  actualizarSolicitud(
    id: number,
    solicitud: Partial<SolicitudFlask>,
  ): Observable<SolicitudFlask> {
    return this.http
      .put<SolicitudFlask>(`${this.apiUrl}/solicitudes/${id}`, solicitud)
      .pipe(catchError(this.handleError));
  }

  /**
   * Elimina una solicitud
   */
  eliminarSolicitud(id: number): Observable<{ mensaje: string }> {
    return this.http
      .delete<{ mensaje: string }>(`${this.apiUrl}/solicitudes/${id}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Sube una foto para una solicitud específica
   */
  subirFoto(solicitudId: number, foto: File): Observable<RespuestaSubidaFoto> {
    // Validar archivo antes de enviar
    const validacion = this.validarArchivo(foto);
    if (!validacion.valido) {
      return throwError(() => new Error(validacion.mensaje));
    }

    const formData = new FormData();
    formData.append('foto', foto, foto.name);

    // No establecer Content-Type manualmente, el navegador lo hace automáticamente con el boundary correcto
    return this.http
      .post<RespuestaSubidaFoto>(
        `${this.apiUrl}/solicitudes/${solicitudId}/foto`,
        formData,
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtiene la URL completa de una foto
   */
  obtenerUrlFoto(nombreFoto: string | null): string | null {
    if (!nombreFoto) {
      return null;
    }
    return `${this.apiUrl}/uploads/${nombreFoto}`;
  }

  /**
   * Valida que el archivo sea válido antes de subirlo
   */
  validarArchivo(archivo: File): { valido: boolean; mensaje: string } {
    // Validar que existe
    if (!archivo) {
      return { valido: false, mensaje: 'No se seleccionó ningún archivo' };
    }

    // Validar tamaño
    if (archivo.size > this.MAX_FILE_SIZE) {
      return {
        valido: false,
        mensaje: `El archivo es muy grande. Máximo ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`,
      };
    }

    // Validar tipo MIME
    if (!archivo.type.startsWith('image/')) {
      return { valido: false, mensaje: 'El archivo debe ser una imagen' };
    }

    // Validar extensión
    const extension = archivo.name.split('.').pop()?.toLowerCase();
    if (!extension || !this.ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        valido: false,
        mensaje: `Extensión no permitida. Use: ${this.ALLOWED_EXTENSIONS.join(', ')}`,
      };
    }

    return { valido: true, mensaje: 'Archivo válido' };
  }

  /**
   * Elimina la foto de una solicitud
   */
  eliminarFoto(solicitudId: number): Observable<SolicitudFlask> {
    return this.actualizarSolicitud(solicitudId, { foto: null });
  }

  /**
   * Manejo centralizado de errores
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let mensajeError = 'Ocurrió un error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      mensajeError = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      if (error.status === 0) {
        mensajeError =
          'No se pudo conectar con el servidor. Verifica que Flask esté ejecutándose.';
      } else if (error.status === 404) {
        mensajeError = 'Recurso no encontrado';
      } else if (error.status === 400) {
        mensajeError = error.error?.error || 'Solicitud inválida';
      } else if (error.status === 500) {
        mensajeError = 'Error interno del servidor';
      } else {
        mensajeError = `Error ${error.status}: ${error.error?.error || error.message}`;
      }
    }

    console.error('Error en SolicitudFlaskService:', mensajeError, error);
    return throwError(() => new Error(mensajeError));
  }
}
