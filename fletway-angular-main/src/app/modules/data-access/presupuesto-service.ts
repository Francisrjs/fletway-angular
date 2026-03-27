import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { Fletero } from '../../core/layouts/fletero';
import { Presupuesto } from '../../core/layouts/presupuesto';
import { AuthService } from '../../core/auth/data-access/auth-service';
import { environment } from '../../../enviroments/enviroment';

interface PresupuestoState {
  presupuestos: Presupuesto[];
  loading: boolean;
  error: string | null;
}

/**
 * 💰 SERVICIO DE PRESUPUESTOS REACTIVO
 *
 * Eventos Socket.IO del Backend:
 * 1. 'nuevo_presupuesto' → Cuando un fletero crea un presupuesto (llega al cliente dueño)
 * 2. 'aceptar_solicitud' → Cuando un cliente acepta un presupuesto (remueve solicitud de otros transportistas)
 */
@Injectable({
  providedIn: 'root',
})
export class PresupuestoService {
  private http = inject(HttpClient);
  private _authService = inject(AuthService);
  private socket: Socket;
  private apiUrl = environment.apiUrl;

  // 📊 ESTADO PRINCIPAL
  private _state = signal<PresupuestoState>({
    presupuestos: [],
    loading: false,
    error: null,
  });

  // 🎯 SIGNALS PÚBLICOS (COMPUTED - SOLO LECTURA)
  presupuestos = computed(() => this._state().presupuestos);
  loading = computed(() => this._state().loading);
  error = computed(() => this._state().error);

  // 📈 COMPUTED DERIVADOS
  presupuestosPendientes = computed(() =>
    this._state().presupuestos.filter((p) => p.estado === 'pendiente'),
  );

  presupuestosAceptados = computed(() =>
    this._state().presupuestos.filter((p) => p.estado === 'aceptado'),
  );

  presupuestosRechazados = computed(() =>
    this._state().presupuestos.filter((p) => p.estado === 'rechazado'),
  );

  get sesion() {
    return this._authService.userState();
  }

  private _joinedRooms = new Set<string>();

  constructor() {
    console.log('💰 [PresupuestoService] Inicializando...');

    // Conectar socket
    this.socket = io(this.apiUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.initSocketListeners();
    this.initDebugLogger();

    // Observar cambios en la sesión para unirse a las rooms correctas
    effect(() => {
      const session = this._authService.userState();
      if (session.userId && session.isFletero !== null && !session.isFleteroLoading) {
        this.joinSocketRooms(session);
      }
    });
  }

  /**
   * 🏠 Unirse a las rooms de Socket.IO según el rol del usuario
   */
  private joinSocketRooms(session: any) {
    if (!this.socket.connected) return;

    if (session.isFletero) {
      if (!this._joinedRooms.has('fleteros')) {
        this.socket.emit('join_room', { room: 'fleteros' });
        this._joinedRooms.add('fleteros');
        console.log('🏠 [Socket-Presupuestos] Unido a room: fleteros');
      }
      const transportistaId = session.transportista?.transportista_id;
      if (transportistaId) {
        const personalRoom = `fletero_${transportistaId}`;
        if (!this._joinedRooms.has(personalRoom)) {
          this.socket.emit('join_room', { room: personalRoom });
          this._joinedRooms.add(personalRoom);
          console.log(`🏠 [Socket-Presupuestos] Unido a room: ${personalRoom}`);
        }
      }
    } else {
      if (!this._joinedRooms.has('clientes')) {
        this.socket.emit('join_room', { room: 'clientes' });
        this._joinedRooms.add('clientes');
        console.log('🏠 [Socket-Presupuestos] Unido a room: clientes');
      }
      const usuarioIdNum = session.usuarioIdNumerico;
      if (usuarioIdNum) {
        const personalRoom = `cliente_${usuarioIdNum}`;
        if (!this._joinedRooms.has(personalRoom)) {
          this.socket.emit('join_room', { room: personalRoom });
          this._joinedRooms.add(personalRoom);
          console.log(`🏠 [Socket-Presupuestos] Unido a room: ${personalRoom}`);
        }
      }
    }
  }

  /**
   * 🔍 Logger de debugging
   */
  private initDebugLogger() {
    effect(() => {
      const state = this._state();
      console.log('📊 [PresupuestoState]', {
        presupuestos: state.presupuestos.length,
        loading: state.loading,
        error: state.error,
      });
    });
  }

  /**
   * 🔌 CONFIGURACIÓN DE SOCKET.IO
   */
  private initSocketListeners() {
    this.socket.on('connect', () => {
      console.log('✅ [Socket-Presupuestos] Conectado');
      // Re-unirse a las rooms al reconectar
      this._joinedRooms.clear();
      const session = this._authService.userState();
      if (session.userId && session.isFletero !== null) {
        this.joinSocketRooms(session);
      }
    });

    this.socket.on('disconnect', () => {
      console.warn('⚠️ [Socket-Presupuestos] Desconectado');
      this._joinedRooms.clear();
    });

    // ========================================
    // 🎯 EVENTO 1: NUEVO PRESUPUESTO
    // ========================================
    /**
     * Cuando un FLETERO crea un presupuesto, este evento le llega al CLIENTE dueño de la solicitud
     *
     * Data: {
     *   presupuesto_id, solicitud_id, transportista_id, precio_estimado, comentario, estado,
     *   transportista: { transportista_id, calificacion_promedio, total_calificaciones, usuario: {...} }
     * }
     */
    this.socket.on('nuevo_presupuesto', (data: any) => {
      console.log('🆕 [Socket] Nuevo presupuesto recibido:', data);
      this.handleNuevoPresupuesto(data);
    });

    // ========================================
    // 🎯 EVENTO 2: PRESUPUESTO ACEPTADO
    // ========================================
    /**
     * Cuando un CLIENTE acepta un presupuesto:
     * - Para OTROS TRANSPORTISTAS: la solicitud se debe remover de su vista (ya no pueden cotizar)
     * - Para el TRANSPORTISTA GANADOR: la solicitud sigue visible pero con estado "pendiente"
     *
     * Data: solicitud.to_dict() completa
     */
    this.socket.on('aceptar_solicitud', (data: any) => {
      console.log('✅ [Socket] Presupuesto aceptado - Solicitud:', data);
      this.handlePresupuestoAceptado(data);
    });
  }

  /**
   * 🆕 HANDLER: Nuevo presupuesto creado
   *
   * Caso de uso: Un fletero envió una cotización para mi solicitud
   * Acción: Agregar el presupuesto al array local
   */
  private handleNuevoPresupuesto(presupuesto: any) {
    // Verificar que el presupuesto es para una solicitud que estoy viendo
    const presupuestosActuales = this._state().presupuestos;

    // Si ya existe, no duplicar
    const yaExiste = presupuestosActuales.some(
      (p) => p.presupuesto_id === presupuesto.presupuesto_id,
    );

    if (yaExiste) {
      console.log(
        '⚠️ [handleNuevoPresupuesto] Presupuesto ya existe, ignorando',
      );
      return;
    }

    // Agregar al estado
    this._state.update((s) => ({
      ...s,
      presupuestos: [...s.presupuestos, presupuesto],
    }));

    console.log(
      '✅ [handleNuevoPresupuesto] Presupuesto agregado al estado local',
    );
  }

  /**
   * ✅ HANDLER: Presupuesto aceptado
   *
   * Caso de uso: Un cliente aceptó un presupuesto
   * Acción para FLETEROS:
   *   - Si eres el ganador: no hacer nada (la solicitud sigue visible)
   *   - Si NO eres el ganador: remover presupuesto de la lista (ya no puedes cotizar)
   */
  private handlePresupuestoAceptado(solicitud: any) {
    const usuario = this.sesion;

    if (!usuario) {
      console.log('⚠️ [handlePresupuestoAceptado] No hay usuario en sesión');
      return;
    }

    // Obtener el presupuesto aceptado de la solicitud
    const presupuestoAceptadoId = solicitud.presupuesto_aceptado;

    if (!presupuestoAceptadoId) {
      console.log(
        '⚠️ [handlePresupuestoAceptado] No hay presupuesto aceptado en la solicitud',
      );
      return;
    }

    // Actualizar estado: marcar presupuestos como rechazados excepto el ganador
    this._state.update((s) => ({
      ...s,
      presupuestos: s.presupuestos.map((p) => {
        if (p.solicitud_id === solicitud.solicitud_id) {
          if (p.presupuesto_id === presupuestoAceptadoId) {
            // Este es el ganador
            return { ...p, estado: 'aceptado' };
          } else {
            // Los demás fueron rechazados
            return { ...p, estado: 'rechazado' };
          }
        }
        return p;
      }),
    }));

    console.log(
      '✅ [handlePresupuestoAceptado] Estados de presupuestos actualizados',
    );
  }

  // ========================================
  // 📡 MÉTODOS HTTP DE LA API
  // ========================================

  /**
   * ➕ CREAR PRESUPUESTO
   */
  async addPresupuesto(payload: {
    solicitud: number;
    precio: number;
    comentario: string;
  }): Promise<Presupuesto | null> {
    try {
      console.log('💰 [addPresupuesto] Creando presupuesto:', payload);

      this._state.update((s) => ({ ...s, loading: true, error: null }));

      const response = await firstValueFrom(
        this.http.post<Presupuesto>(`${this.apiUrl}/api/presupuestos`, {
          solicitud_id: payload.solicitud,
          precio_estimado: payload.precio,
          comentario: payload.comentario,
        }),
      );

      console.log('✅ [addPresupuesto] Presupuesto creado:', response);

      // ⚠️ NO actualizamos el estado local aquí
      // El socket 'nuevo_presupuesto' se encargará de notificar al cliente
      // Para el transportista, agregamos manualmente a su lista
      this._state.update((s) => ({
        ...s,
        loading: false,
        presupuestos: [...s.presupuestos, response],
      }));

      return response;
    } catch (err: any) {
      console.error('❌ [addPresupuesto] Error:', err);
      this._state.update((s) => ({
        ...s,
        loading: false,
        error: err.message || 'Error al crear presupuesto',
      }));
      return null;
    }
  }

  /**
   * ✏️ EDITAR PRESUPUESTO
   */
  async editarPresupuesto(presupuestoId: number, payload: {
    precio: number;
    comentario: string;
  }): Promise<Presupuesto | null> {
    try {
      console.log(`💰 [editarPresupuesto] Editando presupuesto ${presupuestoId}:`, payload);

      this._state.update(s => ({ ...s, loading: true, error: null }));

      const response = await firstValueFrom(
        this.http.put<Presupuesto>(
          `${this.apiUrl}/api/presupuestos/${presupuestoId}`,
          {
            precio_estimado: payload.precio,
            comentario: payload.comentario
          }
        )
      );

      console.log('✅ [editarPresupuesto] Presupuesto actualizado:', response);

      // Actualizar estado local
      this._state.update(s => ({
        ...s,
        loading: false,
        presupuestos: s.presupuestos.map(p =>
          p.presupuesto_id === presupuestoId ? response : p
        )
      }));

      return response;

    } catch (err: any) {
      console.error('❌ [editarPresupuesto] Error:', err);
      this._state.update(s => ({
        ...s,
        loading: false,
        error: err.message || 'Error al actualizar presupuesto'
      }));
      return null;
    }
  }

  /**
   * 📊 OBTENER RESUMEN DE PRESUPUESTOS
   */
  async getResumenPresupuestos(solicitudId: number): Promise<{
    mostrables: number;
    hayAceptado: boolean;
  }> {
    try {
      console.log('📊 [getResumenPresupuestos] Solicitud:', solicitudId);

      const response = await firstValueFrom(
        this.http.get<{
          total: number;
          pendientes: number;
          aceptados: number;
          rechazados: number;
        }>(`${this.apiUrl}/api/presupuestos/resumen/${solicitudId}`),
      );

      const mostrables = response.pendientes;
      const hayAceptado = response.aceptados > 0;

      console.log('✅ [getResumenPresupuestos]', { mostrables, hayAceptado });

      return { mostrables, hayAceptado };
    } catch (err) {
      console.error('❌ [getResumenPresupuestos] Error:', err);
      return { mostrables: 0, hayAceptado: false };
    }
  }

  /**
   * 📊 OBTENER RESÚMENES EN BATCH (OPTIMIZADO)
   */
  async getResumenesBatch(
    solicitudIds: number[],
  ): Promise<Record<string, any>> {
    try {
      console.log(
        '📦 [getResumenesBatch] Procesando',
        solicitudIds.length,
        'solicitudes',
      );

      const response = await firstValueFrom(
        this.http.post<Record<string, any>>(
          `${this.apiUrl}/api/presupuestos/resumenes-batch`,
          { solicitud_ids: solicitudIds },
        ),
      );

      console.log('✅ [getResumenesBatch] Resúmenes recibidos');

      return response;
    } catch (err) {
      console.error('❌ [getResumenesBatch] Error:', err);
      return {};
    }
  }

  /**
   * 🔍 OBTENER PRESUPUESTOS POR SOLICITUD
   */
  async getPresupuestosBySolicitudId(
    solicitudId: number,
    forceRefresh = false,
  ): Promise<Presupuesto[] | null> {
    try {
      console.log('🔍 [getPresupuestosBySolicitudId] Solicitud:', solicitudId);

      this._state.update((s) => ({ ...s, loading: true, error: null }));

      const response = await firstValueFrom(
        this.http.get<Presupuesto[]>(
          `${this.apiUrl}/api/presupuestos/solicitud/${solicitudId}`,
        ),
      );

      console.log(
        '✅ [getPresupuestosBySolicitudId] Presupuestos:',
        response?.length || 0,
      );

      // Actualizar estado
      this._state.update((s) => ({
        ...s,
        presupuestos: response || [],
        loading: false,
        error: null,
      }));

      return response || [];
    } catch (err: any) {
      console.error('❌ [getPresupuestosBySolicitudId] Error:', err);
      this._state.update((s) => ({
        ...s,
        error: err.message || 'Error al cargar presupuestos',
        loading: false,
      }));
      return null;
    }
  }

  /**
   * 📦 OBTENER PRESUPUESTOS COMPLETOS EN BATCH (OPTIMIZADO)
   */

  async getPresupuestosCompletoBatch(): Promise<void> {
    try {
      console.log(
        '📦 [getPresupuestosCompletoBatch] Cargando todos los presupuestos...',
      );

      this._state.update((s) => ({ ...s, loading: true, error: null }));

      const response = await firstValueFrom(
        this.http.get<Record<string, Presupuesto[]>>(
          `${this.apiUrl}/api/presupuestos/completo-batch`,
        ),
      );

      // Aplanar el objeto { "solicitud_id": [presupuestos] } en un array plano
      const todosLosPresupuestos: Presupuesto[] =
        Object.values(response).flat();

      console.log(
        `✅ [getPresupuestosCompletoBatch] ${todosLosPresupuestos.length} presupuestos cargados`,
      );

      this._state.update((s) => ({
        ...s,
        presupuestos: todosLosPresupuestos,
        loading: false,
        error: null,
      }));
    } catch (err: any) {
      console.error('❌ [getPresupuestosCompletoBatch] Error:', err);
      this._state.update(s => ({
        ...s,
        loading: false,
        error: err.message || 'Error al cargar presupuestos'
      }));
    }
  }

  /**
   * ✅ ACEPTAR PRESUPUESTO
   */
  async aceptarPresupuesto(
    presupuestoId: number,
    solicitudId: number,
  ): Promise<boolean> {
    try {
      console.log('✅ [aceptarPresupuesto]', { presupuestoId, solicitudId });

      this._state.update((s) => ({ ...s, loading: true, error: null }));

      const response = await firstValueFrom(
        this.http.post<any>(
          `${this.apiUrl}/api/presupuestos/${presupuestoId}/aceptar`,
          { solicitud_id: solicitudId },
        ),
      );

      console.log('✅ [aceptarPresupuesto] Presupuesto aceptado');

      // ✅ Actualizar estado local: marcar ganador como 'aceptado', demás como 'rechazado'
      this._state.update(s => ({
        ...s,
        loading: false,
        presupuestos: s.presupuestos.map(p => {
          if (p.solicitud_id === solicitudId) {
            if (p.presupuesto_id === presupuestoId) {
              return { ...p, estado: 'aceptado' };
            } else {
              return { ...p, estado: 'rechazado' };
            }
          }
          return p;
        })
      }));

      return true;
    } catch (err: any) {
      console.error('❌ [aceptarPresupuesto] Error:', err);
      this._state.update((s) => ({
        ...s,
        loading: false,
        error: err.message || 'Error al aceptar presupuesto',
      }));
      return false;
    }
  }

  /**
   * ❌ RECHAZAR PRESUPUESTO
   */
  async rechazarPresupuesto(
    presupuestoId: number,
    solicitudId: number,
  ): Promise<boolean> {
    try {
      console.log('❌ [rechazarPresupuesto]', { presupuestoId, solicitudId });

      this._state.update((s) => ({ ...s, loading: true, error: null }));

      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/api/presupuestos/${presupuestoId}/rechazar`,
          {},
        ),
      );

      console.log('✅ [rechazarPresupuesto] Presupuesto rechazado');

      // Actualizar estado local
      this._state.update((s) => ({
        ...s,
        loading: false,
        presupuestos: s.presupuestos.map((p) =>
          p.presupuesto_id === presupuestoId
            ? { ...p, estado: 'rechazado' }
            : p,
        ),
      }));

      return true;
    } catch (err: any) {
      console.error('❌ [rechazarPresupuesto] Error:', err);
      this._state.update((s) => ({
        ...s,
        loading: false,
        error: err.message || 'Error al rechazar presupuesto',
      }));
      return false;
    }
  }

  /**
   * 🚚 OBTENER INFORMACIÓN DEL TRANSPORTISTA
   */
  async getFleteroById(fleteroId: number): Promise<Fletero | null> {
    try {
      console.log('🚚 [getFleteroById] Transportista:', fleteroId);

      const response = await firstValueFrom(
        this.http.get<Fletero>(
          `${this.apiUrl}/api/transportistas/${fleteroId}`,
        ),
      );

      console.log('✅ [getFleteroById] Transportista obtenido:', response);

      return response;
    } catch (err) {
      console.error('❌ [getFleteroById] Error:', err);
      return null;
    }
  }

  /**
   * 📋 OBTENER PRESUPUESTOS DEL TRANSPORTISTA
   */
  async getPresupuestosDelTransportista(): Promise<Presupuesto[] | null> {
    try {
      console.log('📋 [getPresupuestosDelTransportista] Obteniendo...');

      this._state.update((s) => ({ ...s, loading: true, error: null }));

      const response = await firstValueFrom(
        this.http.get<Presupuesto[]>(
          `${this.apiUrl}/api/presupuestos/mis-presupuestos`,
        ),
      );

      console.log(
        '✅ [getPresupuestosDelTransportista] Presupuestos:',
        response?.length || 0,
      );

      this._state.update((s) => ({
        ...s,
        presupuestos: response || [],
        loading: false,
      }));

      return response || [];
    } catch (err: any) {
      console.error('❌ [getPresupuestosDelTransportista] Error:', err);
      this._state.update((s) => ({
        ...s,
        loading: false,
        error: err.message || 'Error al cargar presupuestos',
      }));
      return null;
    }
  }

  /**
   * 🧹 LIMPIAR ESTADO
   */
  clearState() {
    this._state.set({
      presupuestos: [],
      loading: false,
      error: null,
    });
  }

  /**
   * 🧹 CLEANUP al destruir el servicio
   */
  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
      console.log('🔌 [Socket-Presupuestos] Desconectado');
    }
  }
}
