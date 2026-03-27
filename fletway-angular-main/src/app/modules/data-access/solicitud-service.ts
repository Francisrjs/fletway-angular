import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '../../core/auth/data-access/auth-service';
import { Localidad } from '../../core/layouts/localidad';
import { Solicitud } from '../../core/layouts/solicitud';
import { Supabase } from '../../shared/data-access/supabase';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../enviroments/enviroment';

interface SolicitudState {
  solicitudes: Solicitud[];
  loading: boolean;
  error: boolean;
}

interface PresupuestoAceptadoEvent {
  solicitud_id: number;
  presupuesto_id: number;
  transportista_id: number;
  presupuesto: any; // Presupuesto completo con transportista
}

@Injectable({
  providedIn: 'root',
})
export class SolcitudService {
  private _supabaseClient = inject(Supabase).supabaseCLient;
  private _authService = inject(AuthService);
  private http = inject(HttpClient);
  private socket: Socket;
  private apiUrl = environment.apiUrl;

  // 📊 ESTADO PRINCIPAL
  private _state = signal<SolicitudState>({
    solicitudes: [],
    loading: false,
    error: false,
  });

  // 🎯 SIGNALS PÚBLICOS
  solicitudes = computed(() => this._state().solicitudes);
  loading = computed(() => this._state().loading);
  error = computed(() => this._state().error);

  // 🚚 SIGNALS PARA TRANSPORTISTA
  solicitudes_pendientes = signal<Solicitud[]>([]);
  solicitudes_disponibles = signal<Solicitud[]>([]);

  // 📈 COMPUTED DERIVADOS
  solicitudes_completadas = computed(() =>
    this._state().solicitudes.filter(
      (s) => s.estado === 'completado' || s.estado === 'completada',
    ),
  );

  get sesion() {
    return this._authService.userState();
  }

  private _joinedRooms = new Set<string>();

  constructor() {
    console.log('🚀 [SolicitudService] Inicializando...');

    // Inicializar socket
    this.socket = io(this.apiUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.initSocketListeners();

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
    if (!this.socket.connected) {
      // Si el socket no está conectado aún, se unirá al reconectar (ver handler 'connect')
      return;
    }

    if (session.isFletero) {
      // FLETERO: unirse a room general y personal
      if (!this._joinedRooms.has('fleteros')) {
        this.socket.emit('join_room', { room: 'fleteros' });
        this._joinedRooms.add('fleteros');
        console.log('🏠 [Socket] Unido a room: fleteros');
      }
      const transportistaId = session.transportista?.transportista_id;
      if (transportistaId) {
        const personalRoom = `fletero_${transportistaId}`;
        if (!this._joinedRooms.has(personalRoom)) {
          this.socket.emit('join_room', { room: personalRoom });
          this._joinedRooms.add(personalRoom);
          console.log(`🏠 [Socket] Unido a room: ${personalRoom}`);
        }
      }
    } else {
      // CLIENTE: unirse a room general y personal
      if (!this._joinedRooms.has('clientes')) {
        this.socket.emit('join_room', { room: 'clientes' });
        this._joinedRooms.add('clientes');
        console.log('🏠 [Socket] Unido a room: clientes');
      }
      const usuarioIdNum = session.usuarioIdNumerico;
      if (usuarioIdNum) {
        const personalRoom = `cliente_${usuarioIdNum}`;
        if (!this._joinedRooms.has(personalRoom)) {
          this.socket.emit('join_room', { room: personalRoom });
          this._joinedRooms.add(personalRoom);
          console.log(`🏠 [Socket] Unido a room: ${personalRoom}`);
        }
      }
    }
  }

  /**
   * 🔌 CONFIGURACIÓN DE SOCKET.IO - EVENTOS DEL BACKEND
   */
  private initSocketListeners() {
    // Conexión/Desconexión
    this.socket.on('connect', () => {
      console.log('✅ [Socket] Conectado al servidor');
      // Re-unirse a las rooms al reconectar
      this._joinedRooms.clear();
      const session = this._authService.userState();
      if (session.userId && session.isFletero !== null) {
        this.joinSocketRooms(session);
      }
    });

    this.socket.on('disconnect', () => {
      console.warn('⚠️ [Socket] Desconectado del servidor');
      this._joinedRooms.clear();
    });

    /*this.socket.on('presupuesto_aceptado',(data: PresupuestoAceptadoEvent) => {
      console.log('Presupuesto acepta')});*/

    // ========================================
    // 1️⃣ CREAR SOLICITUD
    // ========================================
    this.socket.on('nueva_solicitud', (solicitudCompleta: Solicitud) => {
      console.log('🆕 [Socket] Nueva solicitud creada:', solicitudCompleta);

      const session = this.sesion;
      if (!session) return;

      if (session.isFletero) {
        // FLETERO: Agregar a solicitudes disponibles si está en sus zonas
        this.handleNuevaSolicitudFletero(solicitudCompleta);
      } else {
        // CLIENTE: Agregar a su lista de solicitudes
        this.handleNuevaSolicitudCliente(solicitudCompleta);
      }
    });

    // ========================================
    // 2️⃣ EDITAR SOLICITUD
    // ========================================
    this.socket.on('solicitud_actualizada', (data: any) => {
      console.log('✏️ [Socket] Solicitud actualizada:', data);

      const session = this.sesion;
      if (!session) return;

      if (session.isFletero) {
        // FLETERO: Actualizar en disponibles o pendientes
        this.handleActualizarSolicitudFletero(data);
      } else {
        // CLIENTE: Actualizar en su lista
        this.handleActualizarSolicitudCliente(data);
      }
    });

    // ========================================
    // 3️⃣ CANCELAR SOLICITUD
    // ========================================
    this.socket.on(
      'solicitud_cancelada',
      (data: {
        solicitud_id: number;
        cancelado_por: 'cliente' | 'fletero';
        solicitud?: any;
      }) => {
        console.log('🗑️ [Socket] Solicitud cancelada:', data);

        const session = this.sesion;
        if (!session) return;

        if (session.isFletero) {
          // FLETERO: Siempre eliminar de disponibles y pendientes
          // (ya sea que canceló el cliente o el propio fletero)
          this.handleCancelarSolicitudFletero(data.solicitud_id);
        } else {
          // CLIENTE:
          if (data.cancelado_por === 'fletero') {
            // El fletero canceló → actualizar estado a 'cancelado' en la lista del cliente
            // (para que la card muestre el estado sin desaparecer)
            this.handleSolicitudCanceladaPorFletero(
              data.solicitud_id,
              data.solicitud,
            );
          } else {
            // El cliente mismo canceló → eliminar de su lista
            this.handleCancelarSolicitudCliente(data.solicitud_id);
          }
        }
      },
    );

    // ========================================
    // 4️⃣ ACEPTAR PRESUPUESTO
    // ========================================
    this.socket.on('presupuesto_aceptado', (data: PresupuestoAceptadoEvent) => {
      console.log('💰 [Socket] Presupuesto aceptado:', data);

      const session = this.sesion;
      if (!session) return;

      if (session.isFletero) {
        // FLETERO: Mover de disponibles a pendiente0s y actualizar
        this.handlePresupuestoAceptadoFletero(data);
      } else {
        // CLIENTE: Actualizar solicitud a pendiente con datos del fletero
        this.handlePresupuestoAceptadoCliente(data);
      }
    });

    this.socket.on('aceptar_solicitud', (data) => {
      // Para fleteros: verificar si soy el ganador
      // Si no soy el ganador, remover la solicitud
      this.handleSolicitudAceptada(data);
    });

    // ========================================
    // 5️⃣ COMENZAR VIAJE
    // ========================================
    this.socket.on('viaje_iniciado', (solicitudCompleta: Solicitud) => {
      console.log('🚚 [Socket] Viaje iniciado:', solicitudCompleta);

      const session = this.sesion;
      if (!session) return;

      if (session.isFletero) {
        // FLETERO: Actualizar estado en pendientes
        this.handleViajeIniciadoFletero(solicitudCompleta);
      } else {
        // CLIENTE: Actualizar estado de la solicitud
        this.handleViajeIniciadoCliente(solicitudCompleta);
      }
    });

    // ========================================
    // 6️⃣ COMPLETAR VIAJE
    // ========================================
    this.socket.on('viaje_completado', (solicitud: Solicitud) => {
      console.log('✅ [Socket] Viaje completado:', solicitud);

      const session = this.sesion;
      if (!session) return;

      if (session.isFletero) {
        // FLETERO: Actualizar o mover a completadas
        this.handleViajeCompletadoFletero(solicitud);
      } else {
        // CLIENTE: Actualizar y habilitar calificación
        this.handleViajeCompletadoCliente(solicitud);
      }
    });
  }

  private handlePresupuestoAceptadoFletero(data: {
    solicitud_id: number;
    presupuesto_id: number;
    transportista_id: number;
    presupuesto: any; // ✅ Ahora incluye datos completos
  }) {
    const session = this.sesion;
    if (!session) return;

    // ✅ Verificar si es mi presupuesto usando el userId de la sesión
    // Esto asume que el backend incluye el usuario_id en presupuesto.transportista.usuario
    const esmiPresupuesto =
      data.presupuesto?.transportista?.usuario?.u_id === session.userId;

    if (!esmiPresupuesto) {
      // Si no es mi presupuesto, eliminar de disponibles
      const disponibles = this.solicitudes_disponibles();
      this.solicitudes_disponibles.set(
        disponibles.filter((s) => s.solicitud_id !== data.solicitud_id),
      );
      console.log(
        '✅ [Fletero] Solicitud eliminada - presupuesto aceptado fue de otro',
      );
      return;
    }

    // Es MI presupuesto: mover de disponibles a pendientes
    const disponibles = this.solicitudes_disponibles();
    const solicitud = disponibles.find(
      (s) => s.solicitud_id === data.solicitud_id,
    );

    if (solicitud) {
      // Eliminar de disponibles
      this.solicitudes_disponibles.set(
        disponibles.filter((s) => s.solicitud_id !== data.solicitud_id),
      );

      // ✅ Actualizar estado y agregar datos del presupuesto
      const solicitudActualizada: Solicitud = {
        ...solicitud,
        estado: 'pendiente' as any,
        presupuesto_aceptado: data.presupuesto_id,
        presupuesto: data.presupuesto, // ✅ Datos completos del backend
      };

      const pendientes = this.solicitudes_pendientes();
      this.solicitudes_pendientes.set([solicitudActualizada, ...pendientes]);

      console.log(
        '✅ [Fletero] Solicitud movida a pendientes con botón para realizar viaje',
      );
    }
  }

  // HANDLERS PARA FLETERO
  // ========================================

  /**
   * 🚚 FLETERO: Nueva solicitud disponible
   */
  private handleNuevaSolicitudFletero(solicitud: Solicitud) {
    // Agregar a solicitudes disponibles
    const disponibles = this.solicitudes_disponibles();

    // Verificar que no esté ya en la lista
    const existe = disponibles.some(
      (s) => s.solicitud_id === solicitud.solicitud_id,
    );
    if (!existe) {
      this.solicitudes_disponibles.set([solicitud, ...disponibles]);
      console.log('✅ [Fletero] Solicitud agregada a disponibles');
    }
  }


  //
  private handleSolicitudAceptada(solicitud: any) {
    const usuario = this.sesion;

    if (!usuario) {
      console.log('⚠️ [handleSolicitudAceptada] No hay usuario en sesión');
      return;
    }

    // ========================================
    // VERIFICAR SI SOY FLETERO
    // ========================================

    const miTransportistaId = usuario.transportista?.transportista_id;

    if (!miTransportistaId) {
      // No soy fletero, probablemente soy cliente
      // El cliente no necesita filtrar solicitudes aquí
      console.log(
        '👤 [handleSolicitudAceptada] Soy cliente, actualizando solicitud',
      );

      // Para el cliente: solo actualizar la solicitud con el presupuesto aceptado
      this._state.update((s) => ({
        ...s,
        solicitudes: s.solicitudes.map((sol) => {
          if (sol.solicitud_id === solicitud.solicitud_id) {
            return {
              ...sol,
              estado: solicitud.estado,
              presupuesto_aceptado: solicitud.presupuesto_aceptado,
              presupuesto: solicitud.presupuesto,
            };
          }
          return sol;
        }),
      }));

      return;
    }

    // ========================================
    // LÓGICA PARA FLETEROS
    // ========================================

    const presupuestoGanador = solicitud.presupuesto;

    if (!presupuestoGanador) {
      console.log(
        '⚠️ [handleSolicitudAceptada] No hay presupuesto ganador en la solicitud',
      );
      return;
    }

    const transportistaGanadorId = presupuestoGanador.transportista_id;

    if (!transportistaGanadorId) {
      console.log(
        '⚠️ [handleSolicitudAceptada] No hay transportista_id en el presupuesto ganador',
      );
      return;
    }

    // ========================================
    // DECISIÓN: ¿SOY EL GANADOR?
    // ========================================

    if (transportistaGanadorId === miTransportistaId) {
      // ✅ SOY EL GANADOR
      console.log(
        '🎉 [Socket] ¡GANÉ! Moviendo solicitud de disponibles → pendientes',
      );
      console.log('   → Solicitud:', solicitud.solicitud_id);
      console.log('   → Presupuesto:', presupuestoGanador.presupuesto_id);

      // La solicitud con datos actualizados
      const solicitudGanada: Solicitud = {
        ...solicitud,
        estado: 'pendiente' as any,
        presupuesto_aceptado: presupuestoGanador.presupuesto_id,
        presupuesto: presupuestoGanador,
      };

      // 1. Remover de disponibles (ya no está sin transportista)
      const disponibles = this.solicitudes_disponibles();
      this.solicitudes_disponibles.set(
        disponibles.filter((s) => s.solicitud_id !== solicitud.solicitud_id),
      );

      // 2. Agregar a pendientes (el fletero puede ahora iniciar el viaje)
      const pendientes = this.solicitudes_pendientes();
      const yaEnPendientes = pendientes.some(
        (s) => s.solicitud_id === solicitud.solicitud_id,
      );
      if (!yaEnPendientes) {
        this.solicitudes_pendientes.set([solicitudGanada, ...pendientes]);
      } else {
        // Si ya estaba (re-conexión), actualizar su estado
        this.solicitudes_pendientes.set(
          pendientes.map((s) =>
            s.solicitud_id === solicitud.solicitud_id ? solicitudGanada : s,
          ),
        );
      }

      console.log(
        '✅ [Socket] Solicitud movida a pendientes — botón "Iniciar viaje" disponible',
      );
    } else {
      // ❌ NO SOY EL GANADOR — remover de disponibles
      console.log('😞 [Socket] No gané — removiendo solicitud de disponibles');
      console.log('   → Mi transportista_id:', miTransportistaId);
      console.log('   → Ganador transportista_id:', transportistaGanadorId);

      const disponibles = this.solicitudes_disponibles();
      this.solicitudes_disponibles.set(
        disponibles.filter((s) => s.solicitud_id !== solicitud.solicitud_id),
      );

      console.log('❌ [Socket] Solicitud removida de disponibles');
    }
  }

  /**
   * 🚚 FLETERO: Actualizar solicitud
   */
  private handleActualizarSolicitudFletero(data: any) {
    // Actualizar en disponibles
    const disponibles = this.solicitudes_disponibles();
    const indexDisp = disponibles.findIndex(
      (s) => s.solicitud_id === data.solicitud_id,
    );

    if (indexDisp !== -1) {
      const nuevasDisponibles = [...disponibles];
      nuevasDisponibles[indexDisp] = {
        ...nuevasDisponibles[indexDisp],
        ...data,
      } as Solicitud;
      this.solicitudes_disponibles.set(nuevasDisponibles);
      console.log('✅ [Fletero] Solicitud actualizada en disponibles');
    }

    // Actualizar en pendientes
    const pendientes = this.solicitudes_pendientes();
    const indexPend = pendientes.findIndex(
      (s) => s.solicitud_id === data.solicitud_id,
    );

    if (indexPend !== -1) {
      const nuevasPendientes = [...pendientes];
      nuevasPendientes[indexPend] = {
        ...nuevasPendientes[indexPend],
        ...data,
      } as Solicitud;
      this.solicitudes_pendientes.set(nuevasPendientes);
      console.log('✅ [Fletero] Solicitud actualizada en pendientes');
    }
  }

  /**
   * 🚚 FLETERO: Cancelar solicitud
   */
  private handleCancelarSolicitudFletero(solicitudId: number) {
    // Eliminar de disponibles
    const disponibles = this.solicitudes_disponibles();
    this.solicitudes_disponibles.set(
      disponibles.filter((s) => s.solicitud_id !== solicitudId),
    );

    // Eliminar de pendientes
    const pendientes = this.solicitudes_pendientes();
    this.solicitudes_pendientes.set(
      pendientes.filter((s) => s.solicitud_id !== solicitudId),
    );

    console.log('✅ [Fletero] Solicitud eliminada de disponibles y pendientes');
  }


  /**
   * 🚚 FLETERO: Viaje iniciado
   */
  private handleViajeIniciadoFletero(solicitud: Solicitud) {
    const pendientes = this.solicitudes_pendientes();
    const index = pendientes.findIndex(
      (s) => s.solicitud_id === solicitud.solicitud_id,
    );

    if (index !== -1) {
      const nuevasPendientes = [...pendientes];
      nuevasPendientes[index] = {
        ...nuevasPendientes[index],
        ...solicitud,
        estado: 'en viaje' as any,
      } as Solicitud;
      this.solicitudes_pendientes.set(nuevasPendientes);
      console.log('✅ [Fletero] Viaje iniciado - estado actualizado');
    }
  }

  /**
   * 🚚 FLETERO: Viaje completado
   */
  private handleViajeCompletadoFletero(solicitud: Solicitud) {
    // Eliminar de pendientes
    const pendientes = this.solicitudes_pendientes();
    this.solicitudes_pendientes.set(
      pendientes.filter((s) => s.solicitud_id !== solicitud.solicitud_id),
    );

    // Actualizar en estado general
    this._state.update((s) => ({
      ...s,
      solicitudes: s.solicitudes.map((sol) =>
        sol.solicitud_id === solicitud.solicitud_id
          ? ({ ...sol, ...solicitud, estado: 'completado' as any } as Solicitud)
          : sol,
      ),
    }));

    console.log('✅ [Fletero] Viaje completado - movido a historial');
  }

  // ========================================
  // HANDLERS PARA CLIENTE
  // ========================================

  private handleNuevaSolicitudCliente(solicitud: Solicitud) {
    this._state.update(s => {
      // Evitar duplicados si el socket llega muy rápido o se re-emite
      const existe = s.solicitudes.some(sol => sol.solicitud_id === solicitud.solicitud_id);
      if (existe) return s;

      return {
        ...s,
        solicitudes: [solicitud, ...s.solicitudes]
      };
    });
    console.log('✅ [Cliente] Nueva solicitud agregada o actualizada en la lista');
  }

  /**
   * 👤 CLIENTE: Actualizar solicitud
   */
  private handleActualizarSolicitudCliente(data: any) {
    this._state.update((s) => ({
      ...s,
      solicitudes: s.solicitudes.map((sol) =>
        sol.solicitud_id === data.solicitud_id
          ? ({ ...sol, ...data } as Solicitud)
          : sol,
      ),
    }));
    console.log('✅ [Cliente] Solicitud actualizada');
  }

  /**
   * 👤 CLIENTE: Cancelar solicitud
   */
  private handleCancelarSolicitudCliente(solicitudId: number) {
    this._state.update((s) => ({
      ...s,
      solicitudes: s.solicitudes.filter(
        (sol) => sol.solicitud_id !== solicitudId,
      ),
    }));
    console.log('✅ [Cliente] Solicitud eliminada de la lista');
  }

  /**
   * 👤 CLIENTE: El fletero canceló la solicitud
   * No elimina la solicitud — actualiza su estado a 'cancelado' para que
   * el cliente la vea en su lista con el estado correspondiente
   */
  private handleSolicitudCanceladaPorFletero(
    solicitudId: number,
    solicitudActualizada?: any,
  ) {
    this._state.update((s) => ({
      ...s,
      solicitudes: s.solicitudes.map((sol) => {
        if (sol.solicitud_id === solicitudId) {
          return solicitudActualizada
            ? { ...sol, ...solicitudActualizada, estado: 'cancelado' as any }
            : { ...sol, estado: 'cancelado' as any };
        }
        return sol;
      }),
    }));
    console.log(
      '⚠️ [Cliente] Solicitud cancelada por el fletero — estado actualizado',
    );
  }

  /**
   * 👤 CLIENTE: Presupuesto aceptado - actualizar a pendiente con datos del fletero
   */
  private handlePresupuestoAceptadoCliente(data: {
    solicitud_id: number;
    presupuesto_id: number;
    transportista_id: number;
    presupuesto: any; // ✅ Ahora incluye datos completos
  }) {
    this._state.update((s) => ({
      ...s,
      solicitudes: s.solicitudes.map((sol) =>
        sol.solicitud_id === data.solicitud_id
          ? ({
              ...sol,
              estado: 'pendiente' as any,
              presupuesto_aceptado: data.presupuesto_id,
              presupuesto: data.presupuesto, // ✅ Usar datos del evento
            } as Solicitud)
          : sol,
      ),
    }));

    console.log(
      '✅ [Cliente] Presupuesto aceptado - solicitud actualizada con datos del fletero',
    );
  }

  /**
   * 👤 CLIENTE: Viaje iniciado
   */
  private handleViajeIniciadoCliente(solicitud: Solicitud) {
    this._state.update((s) => ({
      ...s,
      solicitudes: s.solicitudes.map((sol) =>
        sol.solicitud_id === solicitud.solicitud_id
          ? ({ ...sol, ...solicitud, estado: 'en viaje' as any } as Solicitud)
          : sol,
      ),
    }));
    console.log('✅ [Cliente] Viaje iniciado - estado actualizado');
  }

  /**
   * 👤 CLIENTE: Viaje completado - habilitar calificación
   */
  private handleViajeCompletadoCliente(solicitud: Solicitud) {
    this._state.update((s) => ({
      ...s,
      solicitudes: s.solicitudes.map((sol) =>
        sol.solicitud_id === solicitud.solicitud_id
          ? ({
              ...sol,
              ...solicitud,
              estado: 'completado' as any,
              puede_calificar: true,
            } as Solicitud)
          : sol
      ),
    }));
    console.log('✅ [Cliente] Viaje completado - puede calificar');
  }

  // ========================================
  // MÉTODOS DE CARGA INICIAL DE DATOS
  // ========================================

  /**
   * 🚚 OBTENER PEDIDOS DEL TRANSPORTISTA (Dashboard)
   */
  async getAllPedidos(isBackgroundUpdate = false): Promise<Solicitud[] | null> {
    try {
      console.log('🔍 [getAllPedidos] Iniciando...', { isBackgroundUpdate });

      if (!isBackgroundUpdate) {
        this._state.update((s) => ({ ...s, loading: true, error: false }));
      }

      const response = await firstValueFrom(
        this.http.get<{ disponibles: Solicitud[]; pendientes: Solicitud[] }>(
          `${this.apiUrl}/api/transportista/dashboard`,
        ),
      );

      const disponibles = response.disponibles || [];
      const pendientes = response.pendientes || [];
      const totalData = [...disponibles, ...pendientes];

      console.log('📦 [getAllPedidos] Datos recibidos:', {
        disponibles: disponibles.length,
        pendientes: pendientes.length,
        total: totalData.length,
      });

      this.solicitudes_disponibles.set(disponibles);
      this.solicitudes_pendientes.set(pendientes);

      this._state.update((s) => ({
        ...s,
        solicitudes: totalData,
        loading: false,
        error: false,
      }));

      return totalData;
    } catch (err: any) {
      console.error('❌ [getAllPedidos] Error:', err);
      this._state.update((s) => ({ ...s, error: true, loading: false }));
      return null;
    }
  }

  /**
   * 👤 OBTENER PEDIDOS DEL CLIENTE
   */
  async getAllPedidosUsuario(
    isBackgroundUpdate = false,
  ): Promise<Solicitud[] | null> {
    try {
      console.log('🔍 [getAllPedidosUsuario] Iniciando...', {
        isBackgroundUpdate,
      });

      if (!isBackgroundUpdate) {
        this._state.update((s) => ({ ...s, loading: true, error: false }));
      }

      const data = await firstValueFrom(
        this.http.get<any[]>(
          `${this.apiUrl}/solicitudes/mis-pedidos-optimizado`,
        ),
      );

      console.log(
        '📦 [getAllPedidosUsuario] Datos recibidos:',
        data?.length || 0,
      );

      const solicitudes = data || [];

      this._state.update((s) => ({
        ...s,
        solicitudes: solicitudes,
        loading: false,
        error: false,
      }));

      return solicitudes;
    } catch (err: any) {
      console.error('❌ [getAllPedidosUsuario] Error:', err);
      this._state.update((s) => ({ ...s, error: true, loading: false }));
      return null;
    }
  }

  // ========================================
  // MÉTODOS HTTP (CRUD)
  // ========================================

  /**
   * ➕ CREAR SOLICITUD
   */
  async createSolicitud(
    solicitud: Partial<Solicitud>,
  ): Promise<Solicitud | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true }));

      const nuevaSolicitud = await firstValueFrom(
        this.http.post<Solicitud>(`${this.apiUrl}/api/solicitudes`, solicitud),
      );

      // El socket ya manejará la actualización del estado
      this._state.update((s) => ({ ...s, loading: false }));

      return nuevaSolicitud;
    } catch (err) {
      console.error('❌ Error al crear solicitud:', err);
      this._state.update((s) => ({ ...s, loading: false }));
      throw err;
    }
  }

  /**
   * ✏️ EDITAR SOLICITUD
   */
  async editarSolicitud(
    id: number,
    datos: Partial<Solicitud>,
  ): Promise<Solicitud | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true }));

      const solicitudActualizada = await firstValueFrom(
        this.http.patch<Solicitud>(
          `${this.apiUrl}/api/solicitudes/${id}`,
          datos,
        ),
      );

      // El socket ya manejará la actualización del estado
      this._state.update((s) => ({ ...s, loading: false }));

      return solicitudActualizada;
    } catch (err) {
      console.error('❌ Error al editar solicitud:', err);
      this._state.update((s) => ({ ...s, loading: false }));
      throw err;
    }
  }

  /**
   * ❌ CANCELAR SOLICITUD
   */
  /**
   * ❌ CANCELAR SOLICITUD (cliente) — solo cuando estado = 'sin transportista'
   * Rechaza todos los presupuestos pendientes
   */
  async cancelarSolicitud(id: number): Promise<void> {
    try {
      this._state.update((s) => ({ ...s, loading: true }));
      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/api/solicitudes/${id}/cancelar`, {}),
      );
      this._state.update((s) => ({ ...s, loading: false }));
    } catch (err) {
      console.error('❌ Error al cancelar solicitud:', err);
      this._state.update((s) => ({ ...s, loading: false }));
      throw err;
    }
  }

  /**
   * ❌ CANCELAR SOLICITUD (fletero) — cuando estado = 'pendiente' o 'en viaje'
   * Notifica al cliente por socket
   */
  async cancelarSolicitudFletero(id: number): Promise<void> {
    try {
      this._state.update((s) => ({ ...s, loading: true }));
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/api/solicitudes/${id}/cancelar-fletero`,
          {},
        ),
      );
      this._state.update((s) => ({ ...s, loading: false }));
    } catch (err) {
      console.error('❌ Error al cancelar solicitud (fletero):', err);
      this._state.update((s) => ({ ...s, loading: false }));
      throw err;
    }
  }

  /**
   * 💰 ACEPTAR PRESUPUESTO
   */
  async aceptarPresupuesto(
    solicitudId: number,
    presupuestoId: number,
  ): Promise<void> {
    try {
      this._state.update((s) => ({ ...s, loading: true }));

      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/api/solicitudes/${solicitudId}/aceptar-presupuesto`,
          {
            presupuesto_id: presupuestoId,
          },
        ),
      );

      // El socket ya manejará la actualización del estado
      this._state.update((s) => ({ ...s, loading: false }));
    } catch (err) {
      console.error('❌ Error al aceptar presupuesto:', err);
      this._state.update((s) => ({ ...s, loading: false }));
      throw err;
    }
  }

  /**
   * 🚀 COMENZAR VIAJE
   */
  async comenzarViaje(solicitudId: number): Promise<void> {
    try {
      this._state.update((s) => ({ ...s, loading: true }));

      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/api/solicitudes/${solicitudId}/comenzar-viaje`, {})
      );

      // ✅ Actualizar estado local inmediatamente con la respuesta de la API
      const solicitudActualizada = response.solicitud;
      if (solicitudActualizada) {
        const pendientes = this.solicitudes_pendientes();
        this.solicitudes_pendientes.set(
          pendientes.map(s =>
            s.solicitud_id === solicitudId
              ? { ...s, ...solicitudActualizada, estado: 'en viaje' as any }
              : s
          )
        );
      }

      this._state.update(s => ({ ...s, loading: false }));
    } catch (err) {
      console.error('❌ Error al comenzar viaje:', err);
      this._state.update((s) => ({ ...s, loading: false }));
      throw err;
    }
  }

  /**
   * ✅ COMPLETAR VIAJE
   */
  async completarViaje(solicitudId: number): Promise<void> {
    try {
      this._state.update((s) => ({ ...s, loading: true }));

      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/api/solicitudes/${solicitudId}/completar`, {})
      );

      // ✅ Actualizar estado local inmediatamente
      // Eliminar de pendientes (viaje completado)
      const pendientes = this.solicitudes_pendientes();
      this.solicitudes_pendientes.set(
        pendientes.filter(s => s.solicitud_id !== solicitudId)
      );

      this._state.update(s => ({ ...s, loading: false }));
    } catch (err) {
      console.error('❌ Error al completar viaje:', err);
      this._state.update((s) => ({ ...s, loading: false }));
      throw err;
    }
  }

  /**
   * ⭐ CALIFICAR SOLICITUD
   */
  async calificarSolicitud(
    solicitudId: number,
    calificacion: number,
  ): Promise<void> {
    try {
      this._state.update((s) => ({ ...s, loading: true }));

      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/api/solicitudes/${solicitudId}/calificar`,
          {
            calificacion,
          },
        ),
      );

      // Actualizar localmente
      this._state.update((s) => ({
        ...s,
        solicitudes: s.solicitudes.map((sol) =>
          sol.solicitud_id === solicitudId
            ? ({ ...sol, calificacion } as Solicitud)
            : sol,
        ),
        loading: false,
      }));
    } catch (err) {
      console.error('❌ Error al calificar solicitud:', err);
      this._state.update((s) => ({ ...s, loading: false }));
      throw err;
    }
  }

  // ========================================
  // ACTUALIZACIÓN LOCAL DIRECTA
  // ========================================

  /**
   * ✅ Actualizar una solicitud en el estado local (para uso directo del componente)
   * Usado cuando el componente necesita reflejar un cambio inmediato sin esperar socket
   */
  actualizarSolicitudLocal(solicitudId: number, cambios: Partial<Solicitud>): void {
    this._state.update(s => ({
      ...s,
      solicitudes: s.solicitudes.map(sol =>
        sol.solicitud_id === solicitudId
          ? { ...sol, ...cambios } as Solicitud
          : sol
      )
    }));
  }

  // ========================================
  // MÉTODOS AUXILIARES
  // ========================================

  /**
   * 🔍 BUSCAR LOCALIDADES
   */
  async searchLocalidades(query: string): Promise<Localidad[]> {
    const q = query.trim();
    if (!q) return [];

    try {
      const encodedQuery = encodeURIComponent(q);
      const data = await firstValueFrom(
        this.http.get<Localidad[]>(
          `${this.apiUrl}/api/localidades/buscar?q=${encodedQuery}`,
        ),
      );
      return data || [];
    } catch (err) {
      console.error('searchLocalidades error:', err);
      return [];
    }
  }

  /**
   * 📍 OBTENER TODAS LAS LOCALIDADES
   */
  async getAllLocalidades(): Promise<Localidad[]> {
    try {
      const data = await firstValueFrom(
        this.http.get<Localidad[]>(`${this.apiUrl}/api/localidades`),
      );
      return data || [];
    } catch (err) {
      console.error('getAllLocalidades error:', err);
      return [];
    }
  }

  /**
   * 📊 OBTENER HISTORIAL DEL FLETERO
   */
  async getHistorialFletero(): Promise<Solicitud[] | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true, error: false }));

      const data = await firstValueFrom(
        this.http.get<Solicitud[]>(
          `${this.apiUrl}/api/transportista/historial`,
        ),
      );

      console.log('Historial del transportista:', data?.length || 0);
      this._state.update((s) => ({ ...s, loading: false }));
      return data || [];
    } catch (err) {
      console.error('getHistorialFletero error:', err);
      this._state.update((s) => ({ ...s, loading: false }));
      return null;
    }
  }

  /**
   * 📷 OBTENER FOTOS DE UNA SOLICITUD
   */
  async getFotosBySolicitudId(solicitudId: number): Promise<any[]> {
    try {
      const data = await firstValueFrom(
        this.http.get<any[]>(
          `${this.apiUrl}/api/solicitudes/${solicitudId}/fotos`,
        ),
      );
      return data || [];
    } catch (err) {
      console.error('Error en getFotosBySolicitudId:', err);
      return [];
    }
  }

  /**
   * 📤 SUBIR FOTO
   */
  async subirFoto(solicitudId: number, foto: File): Promise<any> {
    try {
      this._state.update((s) => ({ ...s, loading: true }));

      const formData = new FormData();
      formData.append('foto', foto);

      const response = await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/api/solicitudes/${solicitudId}/foto`,
          formData,
        ),
      );

      this._state.update((s) => ({ ...s, loading: false }));
      return response;
    } catch (err) {
      console.error('Error al subir foto:', err);
      this._state.update((s) => ({ ...s, loading: false }));
      throw err;
    }
  }

  /**
   * 🖼️ OBTENER URL DE FOTO
   */
  obtenerUrlFoto(nombreFoto: string): string {
    return `${this.apiUrl}/uploads/${nombreFoto}`;
  }

  /**
   * 🔍 OBTENER SOLICITUD POR ID
   */
  async getPedidoById(id: number): Promise<Solicitud | null> {
    try {
      console.log(`🔍 [getPedidoById] Obteniendo solicitud ${id}`);

      const solicitud = await firstValueFrom(
        this.http.get<Solicitud>(`${this.apiUrl}/api/solicitudes/${id}`),
      );

      console.log('✅ [getPedidoById] Solicitud obtenida:', solicitud);
      return solicitud;
    } catch (err) {
      console.error('❌ [getPedidoById] Error:', err);
      return null;
    }
  }

  /**
   * ✏️ ACTUALIZAR SOLICITUD (Alias de editarSolicitud)
   * Para compatibilidad con código existente
   */
  async updateSolicitud(
    id: number,
    datos: Partial<Solicitud>,
  ): Promise<Solicitud | null> {
    return this.editarSolicitud(id, datos);
  }

  /**
   * 🧹 LIMPIAR al destruir el servicio
   */
  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
      console.log('🔌 [Socket] Desconectado');
    }
  }
}
