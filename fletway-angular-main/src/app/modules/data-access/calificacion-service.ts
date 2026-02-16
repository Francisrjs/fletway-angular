import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * 📊 Interfaz de Calificación
 */
export interface Calificacion {
  calificacion_id?: number;
  solicitud_id: number;
  cliente_id: number;
  transportista_id: number;
  puntuacion: number; // 1-5
  comentario?: string;
  borrado_logico?: boolean;
  creado_en?: Date;
  actualizado_en?: Date;
  // Datos adicionales del cliente (cuando se lista)
  cliente?: {
    usuario_id: number;
    nombre: string;
    apellido: string;
  };
}

/**
 * 📈 Estadísticas del Transportista
 */
export interface EstadisticasTransportista {
  transportista_id: number;
  calificacion_promedio: number; // 1-5
  total_calificaciones: number;
}

/**
 * ✅ Respuesta de verificación
 */
export interface PuedeCalificar {
  puede_calificar: boolean;
  motivo?: string;
}

/**
 * 🎯 Estado de Calificaciones
 */
interface CalificacionState {
  calificaciones: Calificacion[];
  loading: boolean;
  error: boolean;
}

/**
 * ⭐ SERVICIO DE CALIFICACIONES REACTIVO
 *
 * Características:
 * - Crear calificaciones
 * - Obtener estadísticas de transportistas
 * - Verificar si puede calificar
 * - Cache de estadísticas
 * - Signals reactivos
 */
@Injectable({
  providedIn: 'root',
})
export class CalificacionService {
  private http = inject(HttpClient);
  private apiUrl = 'https://fletway-api-533654897399.us-central1.run.app';

  // 📊 ESTADO PRINCIPAL
  private _state = signal<CalificacionState>({
    calificaciones: [],
    loading: false,
    error: false,
  });

  // 🎯 SIGNALS PÚBLICOS
  calificaciones = computed(() => this._state().calificaciones);
  loading = computed(() => this._state().loading);
  error = computed(() => this._state().error);

  // 📈 Cache de estadísticas de transportistas
  private _estadisticasCache = new Map<number, EstadisticasTransportista>();

  // 📝 Cache de calificaciones por solicitud
  private _calificacionesSolicitudCache = new Map<number, Calificacion | null>();

  constructor() {
    console.log('⭐ [CalificacionService] Inicializando...');
  }

  // ========================================
  // 📝 MÉTODOS PRINCIPALES DE LA API
  // ========================================

  /**
   * ⭐ CREAR CALIFICACIÓN
   */
  async crearCalificacion(
    solicitudId: number,
    transportistaId: number,
    puntuacion: number,
    comentario?: string
  ): Promise<Calificacion | null> {
    try {
      console.log('⭐ [crearCalificacion] Creando calificación:', {
        solicitudId,
        transportistaId,
        puntuacion,
        comentario,
      });

      // Validar puntuación
      if (puntuacion < 1 || puntuacion > 5) {
        console.error('❌ [crearCalificacion] Puntuación inválida:', puntuacion);
        return null;
      }

      this._state.update((s) => ({ ...s, loading: true, error: false }));

      const response = await firstValueFrom(
        this.http.post<Calificacion>(
          `${this.apiUrl}/api/calificaciones`,
          {
            solicitud_id: solicitudId,
            transportista_id: transportistaId,
            puntuacion: puntuacion,
            comentario: comentario || '',
          }
        )
      );

      console.log('✅ [crearCalificacion] Calificación creada exitosamente:', response);

      // Actualizar estado local
      this._state.update((s) => ({
        ...s,
        loading: false,
        calificaciones: [...s.calificaciones, response],
      }));

      // Invalidar cache del transportista
      this._estadisticasCache.delete(transportistaId);

      return response;

    } catch (err: any) {
      console.error('❌ [crearCalificacion] Error:', err);
      this._state.update((s) => ({ ...s, loading: false, error: true }));
      throw err; // Re-lanzar para que el componente pueda manejarlo
    }
  }



  async getEstadisticasTransportista(
    transportistaId: number,
    useCache = true
  ): Promise<EstadisticasTransportista | null> {
    try {
      // Verificar cache primero
      if (useCache && this._estadisticasCache.has(transportistaId)) {
        console.log('💾 [getEstadisticas] Usando cache para transportista:', transportistaId);
        return this._estadisticasCache.get(transportistaId)!;
      }

      console.log('📊 [getEstadisticas] Obteniendo estadísticas para transportista:', transportistaId);

      const response = await firstValueFrom(
        this.http.get<EstadisticasTransportista>(
          `${this.apiUrl}/api/calificaciones/transportista/${transportistaId}/estadisticas`
        )
      );

      console.log('✅ [getEstadisticas] Estadísticas obtenidas:', response);

      // Guardar en cache
      this._estadisticasCache.set(transportistaId, response);

      return response;

    } catch (err: any) {
      console.error('❌ [getEstadisticas] Error:', err);
      return null;
    }
  }


  async getCalificacionSolicitud(
    solicitudId: number,
    useCache = true
  ): Promise<Calificacion | null> {
    try {
      // Verificar cache primero
      if (useCache && this._calificacionesSolicitudCache.has(solicitudId)) {
        console.log('💾 [getCalificacionSolicitud] Usando cache para solicitud:', solicitudId);
        return this._calificacionesSolicitudCache.get(solicitudId) || null;
      }

      console.log('📋 [getCalificacionSolicitud] Obteniendo calificación de solicitud:', solicitudId);

      const response = await firstValueFrom(
        this.http.get<Calificacion>(
          `${this.apiUrl}/api/calificaciones/solicitud/${solicitudId}`
        )
      );

      console.log('✅ [getCalificacionSolicitud] Calificación obtenida:', response);

      // Guardar en cache
      this._calificacionesSolicitudCache.set(solicitudId, response);

      return response;

    } catch (err: any) {
      // Error 404 es esperado si no hay calificación
      if (err.status === 404) {
        console.log('ℹ️ [getCalificacionSolicitud] No hay calificación para esta solicitud');
        this._calificacionesSolicitudCache.set(solicitudId, null);
        return null;
      }

      console.error('❌ [getCalificacionSolicitud] Error:', err);
      return null;
    }
  }

  clearCache(transportistaId?: number): void {
    if (transportistaId) {
      this._estadisticasCache.delete(transportistaId);
      console.log('🗑️ Cache de estadísticas invalidado para transportista:', transportistaId);
    } else {
      this._estadisticasCache.clear();
      console.log('🗑️ Cache de estadísticas limpiado completamente');
    }
  }

    clearCalificacionCache(solicitudId?: number): void {
    if (solicitudId) {
      this._calificacionesSolicitudCache.delete(solicitudId);
      console.log('🗑️ Cache de calificación invalidado para solicitud:', solicitudId);
    } else {
      this._calificacionesSolicitudCache.clear();
      console.log('🗑️ Cache de calificaciones limpiado completamente');
    }
  }
}