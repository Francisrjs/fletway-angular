import { computed, inject, Injectable, signal } from '@angular/core';

import { AuthService } from '../../core/auth/data-access/auth-service';
import { Localidad } from '../../core/layouts/localidad';
import { Solicitud } from '../../core/layouts/solicitud';
import { Supabase } from '../../shared/data-access/supabase';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface SolicitudState {
  solicitudes: Solicitud[];
  loading: boolean;
  error: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SolcitudService {
  // CORRECCIÓN: asegúrate que tu provider exponga exactamente 'supabaseClient'
  private _supabaseClient = inject(Supabase).supabaseCLient;
  private _authService = inject(AuthService);
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:5000'; // Tu URL de Flask
  private _state = signal<SolicitudState>({
    solicitudes: [],
    loading: false,
    error: false,
  });

  // Exponer como computed/signals para que la UI pueda suscribirse si querés
  solicitudes = computed(() => this._state().solicitudes);
  loading = computed(() => this._state().loading);
  error = computed(() => this._state().error);
  // Signals writable para solicitudes pendientes y disponibles
  solicitudes_pendientes = signal<Solicitud[]>([]);
  solicitudes_disponibles = signal<Solicitud[]>([]);

  solicitudes_completadas = computed(() =>
    this._state().solicitudes.filter((s) => s.estado === 'completado'),
  );
  // ahora devuelve la data y maneja errores
  // ... imports existentes

  // Agrega este método a tu clase SolcitudService
  async getAllPedidos(): Promise<Solicitud[] | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true, error: false }));

      // 1. Obtener sesión
      const {
        data: { session },
      } = await this._authService.session();
      if (!session?.user?.id) {
        console.warn('Usuario no autenticado');
        return null;
      }

      // 2. Obtener el transportista_id vinculado al usuario logueado
      // Primero buscamos el usuario por su UUID
      const { data: usuarioData, error: userError } = await this._supabaseClient
        .from('usuario')
        .select('usuario_id')
        .eq('u_id', session.user.id)
        .maybeSingle();

      if (userError || !usuarioData) {
        console.error('Error obteniendo usuario:', userError);
        return null;
      }

      // Luego buscamos el transportista usando el usuario_id
      const { data: transportistaData, error: transError } =
        await this._supabaseClient
          .from('transportista')
          .select('transportista_id')
          .eq('usuario_id', usuarioData.usuario_id)
          .maybeSingle();
      console.log('Transportista encontrado:', session.user.id);
      if (transError || !transportistaData) {
        console.error(
          'El usuario actual no es un transportista o error:',
          transError,
        );
        return null;
      }

      const transportistaId = transportistaData.transportista_id;

      // 3. Obtener las localidades de la vista vw_transportista_localidades
      const { data: localidadesData, error: viewError } =
        await this._supabaseClient
          .from('vw_transportista_localidades')
          .select('localidad_id')
          .eq('transportista_id', transportistaId);

      if (viewError) {
        console.error('Error consultando vista de localidades:', viewError);
        return null;
      }

      // Extraemos los IDs en un array simple: [1, 5, 20, ...]
      const idsLocalidades = localidadesData.map((l: any) => l.localidad_id);

      if (idsLocalidades.length === 0) {
        console.warn('El fletero no tiene localidades asignadas.');
        this._state.update((s) => ({ ...s, solicitudes: [] }));
        return [];
      }

      // Formateamos el array para usarlo en el filtro de Supabase: (1,5,20)
      const idsString = `(${idsLocalidades.join(',')})`;

      // 4. Buscar solicitudes 'sin transportista' que coincidan con esas zonas
      // LÓGICA: Origen IN (mis_zonas) OR Destino IN (mis_zonas)

      const { data: solicitudSinTransportista, error: errorSinTransportista } =
        await this._supabaseClient
          .from('solicitud')
          .select(
            `
          *,
          cliente:cliente_id(u_id,email,nombre,apellido,telefono,usuario_id),
          localidad_origen:localidad_origen_id(localidad_id,nombre,provincia,codigo_postal),
          localidad_destino:localidad_destino_id(localidad_id,nombre,provincia,codigo_postal)
        `,
          )
          .in('estado', ['sin transportista'])
          .or(
            `localidad_origen_id.in.${idsString},localidad_destino_id.in.${idsString}`,
          )
          .returns<Solicitud[]>();

      //Agrego las solicitudes aceptadas
      const { data: solicitudesAceptadas, error: errorAceptadas } =
        await this._supabaseClient
          .from('v_solicitudes_transportista')
          .select(
            `
          *,
          cliente:cliente_id(u_id,email,nombre,apellido,telefono,usuario_id),
          localidad_origen:localidad_origen_id(localidad_id,nombre,provincia,codigo_postal),
          localidad_destino:localidad_destino_id(localidad_id,nombre,provincia,codigo_postal)
        `,
          )
          .in('estado', ['pendiente', 'en viaje'])
          .eq('transportista_uuid', session.user.id)
          .returns<Solicitud[]>();
      console.log(
        'Solicitudes encontradas sin transportista:',
        solicitudSinTransportista?.length,
      );
      console.log(
        'Solicitudes encontradas aceptadas:',
        solicitudesAceptadas?.length,
      );
      if (errorAceptadas || errorSinTransportista) {
        console.error(
          'Supabase error al filtrar solicitudes Sin Transportista :',
          errorSinTransportista,
        );
        console.error(
          'Supabase error al filtrar solicitudes Aceptadas:',
          errorAceptadas,
        );
        this._state.update((s) => ({ ...s, error: true }));
        return null;
      }
      const data = [...solicitudSinTransportista, ...solicitudesAceptadas];
      console.log(
        `Solicitudes encontradas en zona (${idsLocalidades.length} locs):`,
        data?.length,
      );

      // Actualizar state principal con todas las solicitudes
      this._state.update((s) => ({ ...s, solicitudes: data || [] }));

      // Separar y actualizar signals específicos
      const disponibles = solicitudSinTransportista || [];
      const pendientes = solicitudesAceptadas || [];

      this.solicitudes_disponibles.set(disponibles);
      this.solicitudes_pendientes.set(pendientes);

      console.log(
        `✅ Actualizados: ${disponibles.length} disponibles, ${pendientes.length} pendientes`,
      );
      console.log('📋 Disponibles:', disponibles);
      console.log('⏳ Pendientes:', pendientes);

      return data || [];
    } catch (err) {
      console.error('getAllPedidos catch:', err);
      this._state.update((s) => ({ ...s, error: true }));
      return null;
    } finally {
      this._state.update((s) => ({ ...s, loading: false }));
    }
  }

  async getSolicitudByid(id: number): Promise<Solicitud | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true, error: false }));

      const { data, error } = await this._supabaseClient
        .from('solicitud')
        .select(
          `
          *,
          cliente:cliente_id(u_id,email,nombre,apellido,telefono,creado_en,usuario_id,actualizado_en,borrado_logico,fecha_registro,fecha_nacimiento),
          localidad_origen:localidad_origen_id(localidad_id,nombre,provincia,codigo_postal),
          localidad_destino:localidad_destino_id(localidad_id,nombre,provincia,codigo_postal)
        `,
        )
        .eq('solicitud_id', id)
        .single<Solicitud>();

      if (error) {
        console.error('Supabase error:', error);
        this._state.update((s) => ({ ...s, error: true }));
        return null;
      }

      if (data) {
        // actualizo la propiedad correcta
        this._state.update((s) => ({ ...s, solicitudes: [data] }));
      }

      if (
        data &&
        !Array.isArray(data) &&
        !(typeof (data as { Error?: unknown }).Error !== 'undefined')
      ) {
        return data;
      }
      return null;
    } catch (err) {
      console.error('getSolicitudByid catch:', err);
      this._state.update((s) => ({ ...s, error: true }));
      return null;
    } finally {
      this._state.update((s) => ({ ...s, loading: false }));
    }
  }
  // Método genérico por estado (usa la columna 'estado')
  async getPedidosByEstado(stateValue: string): Promise<Solicitud[] | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true, error: false }));

      const { data, error } = await this._supabaseClient
        .from('solicitud')
        .select(
          `
          *,
          cliente:cliente_id(u_id,email,nombre,apellido,telefono,creado_en,usuario_id,actualizado_en,borrado_logico,fecha_registro,fecha_nacimiento),
          localidad_origen:localidad_origen_id(localidad_id,nombre,provincia,codigo_postal),
          localidad_destino:localidad_destino_id(localidad_id,nombre,provincia,codigo_postal)
        `,
        )
        .eq('estado', stateValue) // FILTRAMOS por la columna 'estado'
        .returns<Solicitud[]>();

      if (error) {
        console.error('Supabase error:', error);
        this._state.update((s) => ({ ...s, error: true }));
        return null;
      }

      if (data) {
        this._state.update((s) => ({ ...s, solicitudes: data }));
      } else {
        this._state.update((s) => ({ ...s, solicitudes: [] }));
      }

      if (data && Array.isArray(data)) {
        return data;
      }
      return null;
    } catch (err) {
      console.error('getPedidosByEstado catch:', err);
      this._state.update((s) => ({ ...s, error: true }));
      return null;
    } finally {
      this._state.update((s) => ({ ...s, loading: false }));
    }
  }

  // Método específico para "pendiente"
  async getAllPedidosPendientes(): Promise<Solicitud[] | null> {
    // ajustalo si tu DB tiene 'PENDIENTE' en mayúsculas
    return this.getPedidosByEstado('pendiente');
  }

  async getAllPedidosDisponibles(): Promise<Solicitud[] | null> {
    return this.getPedidosByEstado('sin transportista');
  }
  async getAllPedidosEnViaje(): Promise<Solicitud[] | null> {
    return this.getPedidosByEstado('en viaje');
  }

  async getAllPedidosUsuario(): Promise<Solicitud[] | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true, error: false }));

      const {
        data: { session },
      } = await this._authService.session();

      if (!session?.user?.id) {
        console.warn('Usuario no autenticado (session.user.id faltante)');
        this._state.update((s) => ({ ...s, solicitudes: [] }));
        return null;
      }

      // => usar maybeSingle() en lugar de single()
      const { data: userData, error: userError } = await this._supabaseClient
        .from('usuario')
        .select('usuario_id')
        .eq('u_id', session.user.id)
        .maybeSingle();

      if (userError) {
        console.error('Error al obtener id_usuario:', userError);
        this._state.update((s) => ({ ...s, error: true }));
        return null;
      }

      // si no existe usuario asociado al uuid, devolvemos lista vacía
      if (!userData) {
        console.warn('No se encontró usuario para el u_id:', session.user.id);
        this._state.update((s) => ({ ...s, solicitudes: [] }));
        return [];
      }

      const idUsuario = userData.usuario_id;

      const { data, error } = await this._supabaseClient
        .from('solicitud')
        .select(
          `
          *,
          localidad_origen:localidad_origen_id(localidad_id,nombre,provincia,codigo_postal),
          localidad_destino:localidad_destino_id(localidad_id,nombre,provincia,codigo_postal),
            presupuesto:presupuesto_aceptado (
            presupuesto_id,
            transportista:transportista_id (
              transportista_id,
              total_calificaciones,
              cantidad_calificaciones,
              usuario:usuario_id (
                usuario_id,
                nombre,
                apellido
              )
            )
          )
        `,
        )
        .eq('cliente_id', idUsuario)
        .returns<Solicitud[]>();

      if (error) {
        console.error('Supabase error (getAllPedidosUsuario):', error);
        this._state.update((s) => ({ ...s, error: true }));
        return null;
      }

      this._state.update((s) => ({ ...s, solicitudes: data ?? [] }));

      return data ?? [];
    } catch (err) {
      console.error('getAllPedidosUsuario catch:', err);
      this._state.update((s) => ({ ...s, error: true }));
      return null;
    } finally {
      this._state.update((s) => ({ ...s, loading: false }));
    }
  }

  //
  async getAllLocalidades(): Promise<Localidad[] | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true, error: false }));

      const { data, error } = await this._supabaseClient
        .from('localidad')
        .select(
          `
          localidad_id,
          nombre,
          provincia,
          codigo_postal
        `,
        )
        .returns<Localidad[]>();

      if (error) {
        console.error('Supabase error:', error);
        this._state.update((s) => ({ ...s, error: true }));
        return null;
      }

      if (data) {
        // actualizo la propiedad correcta
        this._state.update((s) => ({ ...s, Localidad: data }));
      }
      console.log('LOCALIDADES:', data);
      return data ?? null;
    } catch (err) {
      console.error('getAllLocalidades catch:', err);
      this._state.update((s) => ({ ...s, error: true }));
      return null;
    } finally {
      this._state.update((s) => ({ ...s, loading: false }));
    }
  }

  async solicitudEnViaje(solicitudId: number): Promise<boolean> {
    try {
      const { error } = await this._supabaseClient
        .from('solicitud')
        .update({ estado: 'en viaje' })
        .eq('solicitud_id', solicitudId);

      if (error) throw error;

      // Actualiza la señal local si la solicitud está en el array
      this._state.update((s) => ({
        ...s,
        solicitudes: s.solicitudes.map((sol) =>
          sol.solicitud_id === solicitudId
            ? { ...sol, estado: 'en viaje' }
            : sol,
        ),
      }));
      this.solicitudes_pendientes.update((pendientes) =>
        pendientes.map((sol) =>
          sol.solicitud_id === solicitudId
            ? { ...sol, estado: 'en viaje' }
            : sol,
        ),
      );

      console.log('✅ Solicitud marcada en viaje:', solicitudId);
      return true;
    } catch (err) {
      console.error('Error al marcar solicitud en viaje:', err);
      return false;
    }
  }
  async solicitudCompletada(solicitudId: number): Promise<boolean> {
    try {
      const { error } = await this._supabaseClient
        .from('solicitud')
        .update({ estado: 'completado' })
        .eq('solicitud_id', solicitudId);

      if (error) throw error;

      // Actualiza la señal local si la solicitud está en el array
      this._state.update((s) => ({
        ...s,
        solicitudes: s.solicitudes.map((sol) =>
          sol.solicitud_id === solicitudId
            ? { ...sol, estado: 'completado' }
            : sol,
        ),
      }));
      this.solicitudes_pendientes.update((pendientes) =>
        pendientes.map((sol) =>
          sol.solicitud_id === solicitudId
            ? { ...sol, estado: 'completado' }
            : sol,
        ),
      );
      return true;
    } catch (err) {
      console.error('Error al marcar solicitud en viaje:', err);
      return false;
    }
  }

  async calificarSolicitud(
    solicitudId: number,
    transportistaId: number,
    calificacion: number,
    cantidadActual: number,
    totalActual: number,
  ): Promise<void> {
    /* Actualizar solicitud */
    const { error: errorSolicitud } = await this._supabaseClient
      .from('solicitud')
      .update({ calificacion })
      .eq('solicitud_id', solicitudId);

    if (errorSolicitud) {
      throw errorSolicitud;
    }

    /* Actualizar transportista */
    const { error: errorTransportista } = await this._supabaseClient
      .from('transportista')
      .update({
        cantidad_calificaciones: cantidadActual + 1,
        total_calificaciones: totalActual + calificacion,
      })
      .eq('transportista_id', transportistaId);

    if (errorTransportista) {
      throw errorTransportista;
    }
  }

  async getPedidoById(solicitudId: number | string): Promise<Solicitud | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true, error: false }));

      const { data, error } = await this._supabaseClient
        .from('solicitud')
        .select(
          `
        *,
        cliente:cliente_id(u_id,email,nombre,apellido,telefono,creado_en,usuario_id,actualizado_en,borrado_logico,fecha_registro,fecha_nacimiento),
        localidad_origen:localidad_origen_id(localidad_id,nombre,provincia,codigo_postal),
        localidad_destino:localidad_destino_id(localidad_id,nombre,provincia,codigo_postal)
      `,
        )
        .eq('solicitud_id', solicitudId)
        .maybeSingle();

      if (error) {
        console.error('Supabase error (getPedidoById):', error);
        this._state.update((s) => ({ ...s, error: true }));
        return null;
      }

      return (data as Solicitud) ?? null;
    } catch (err) {
      console.error('getPedidoById catch:', err);
      this._state.update((s) => ({ ...s, error: true }));
      return null;
    } finally {
      this._state.update((s) => ({ ...s, loading: false }));
    }
  }
  // solo incluyo el método modificado dentro de tu SolcitudService
  async createSolicitud(
    payload: {
      direccion_origen: string;
      direccion_destino: string;
      localidad_origen_id: number;
      localidad_destino_id: number;
      fecha_recogida?: string; // yyyy-mm-dd
      hora_recogida_time?: string; // HH:mm
      detalles_carga?: string;
      medidas?: string;
      peso?: number | null;
    },
    // files queda para compatibilidad pero lo ignoramos
  ): Promise<{ data?: Solicitud | null; error?: unknown }> {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await this._supabaseClient.auth.getSession();

      if (sessionError) return { error: sessionError };
      if (!session?.user?.id)
        return { error: new Error('Usuario no autenticado') };

      const { data: userData, error: userError } = await this._supabaseClient
        .from('usuario')
        .select('usuario_id')
        .eq('u_id', session.user.id)
        .maybeSingle();

      if (userError) return { error: userError };
      if (!userData)
        return { error: new Error('No se encontró usuario asociado al u_id') };

      const cliente_id = userData.usuario_id;

      // construir hora_recogida ISO si recibimos fecha + hora
      let hora_recogida_iso: string | null = null;
      if (payload.fecha_recogida && payload.hora_recogida_time) {
        hora_recogida_iso = new Date(
          `${payload.fecha_recogida}T${payload.hora_recogida_time}:00`,
        ).toISOString();
      }

      const row: Partial<Solicitud> = {
        cliente_id,
        direccion_origen: payload.direccion_origen,
        direccion_destino: payload.direccion_destino,
        detalles_carga: payload.detalles_carga ?? null,
        medidas: payload.medidas ?? null,
        peso: payload.peso ?? null,
        estado: 'sin transportista',
        hora_recogida: hora_recogida_iso,
        localidad_origen_id: payload.localidad_origen_id,
        localidad_destino_id: payload.localidad_destino_id,
      };

      const { data: insertData, error: insertError } =
        await this._supabaseClient
          .from('solicitud')
          .insert(row)
          .select()
          .maybeSingle();

      if (insertError) return { error: insertError };

      return { data: insertData as Solicitud };
    } catch (err) {
      console.error('createSolicitud catch:', err);
      return { error: err };
    }
  }
  async searchLocalidades(query: string): Promise<Localidad[]> {
    try {
      const q = query.trim();
      if (!q) return [];

      const { data, error } = await this._supabaseClient
        .from('localidad')
        .select('localidad_id, nombre, provincia, codigo_postal')
        .ilike('nombre', `%${q}%`)
        .limit(10);

      if (error) {
        console.error('searchLocalidades error:', error);
        return [];
      }
      return data ?? [];
    } catch (err) {
      console.error('searchLocalidades catch:', err);
      return [];
    }
  }

  // agregado por mateo para actualizar la solicitud cuando se acepta un presupuesto.

  async actualizarSolicitudConPresupuesto(
    solicitudId: number,
    presupuestoId: number,
  ): Promise<boolean> {
    try {
      const { error } = await this._supabaseClient
        .from('solicitud')
        .update({
          presupuesto_aceptado: presupuestoId, // 👈 campo de tu tabla solicitud
          estado: 'pendiente',
        })
        .eq('solicitud_id', solicitudId);

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error al actualizar solicitud:', err);
      return false;
    }
  }
  /**
   * Sube una foto para una solicitud específica
   */
  subirFoto(solicitudId: number, foto: File): Observable<object> {
    const formData = new FormData();
    formData.append('foto', foto);

    return this.http.post(
      `${this.apiUrl}/solicitudes/${solicitudId}/foto`,
      formData,
    );
  }

  /**
   * Obtiene la URL de la foto
   */
  obtenerUrlFoto(nombreFoto: string): string {
    return `${this.apiUrl}/uploads/${nombreFoto}`;
  }
  async eliminarSolicitud(solicitud_id: number): Promise<void> {
    try {
      const { error } = await this._supabaseClient
        .from('solicitud')
        .delete()
        .eq('solicitud_id', solicitud_id);
      if (error) throw new Error('Error al eliminar solicitud');
      this._state.update((s) => ({
        ...s,
        solicitudes: s.solicitudes.filter(
          (solicitud) => solicitud.solicitud_id !== solicitud_id,
        ),
        loading: false,
        error: false,
      }));
    } catch (error) {
      console.error('Error al eliminar solicitud:', error);
      this._state.update((s) => ({
        ...s,
        loading: false,
        error: true,
      }));
    }
  }
  async updateSolicitud(
    solicitudId: number,
    datos: Partial<{
      foto: string | null;
      estado: string;
      direccion_origen: string;
      direccion_destino: string;
      detalles_carga: string;
      medidas: string;
      peso: number;
      hora_recogida: string;
      localidad_origen_id: number;
      localidad_destino_id: number;
    }>,
  ): Promise<{ data?: Solicitud | null; error?: unknown }> {
    try {
      const { data, error } = await this._supabaseClient
        .from('solicitud')
        .update(datos)
        .eq('solicitud_id', solicitudId)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando solicitud en Supabase:', error);
      }

      return { data, error };
    } catch (err) {
      console.error('Error en updateSolicitud:', err);
      return { data: null, error: err };
    }
  }
  async getSolicitudesDisponibles(): Promise<Solicitud[] | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true, error: false }));

      const {
        data: { session },
      } = await this._authService.session();

      if (!session?.user?.id) {
        console.warn('Usuario no autenticado');
        return null;
      }

      // Obtener solicitudes del transportista usando la vista
      const { data, error } = await this._supabaseClient
        .from('v_solicitudes_transportista')
        .select(
          `
    *,
    localidad_origen:localidad_origen_id(localidad_id,nombre,provincia,codigo_postal),
    localidad_destino:localidad_destino_id(localidad_id,nombre,provincia,codigo_postal),
    presupuesto:presupuesto_aceptado (
      presupuesto_id,
      transportista:transportista_id (
        transportista_id,
        total_calificaciones,
        cantidad_calificaciones,
        usuario:usuario_id (
          usuario_id,
          nombre,
          apellido
        )
      )
    )
  `,
        )
        .eq('transportista_uuid', session.user.id)
        .eq('estado', 'pendiente')
        .returns<Solicitud[]>();

      if (error) {
        console.error('Error obteniendo historial del fletero:', error);
        return null;
      }

      console.log(
        ' Historial de viajes del transportista:',
        data?.length || 0,
        'solicitudes encontradas',
      );
      this.solicitudes_pendientes.update((s) => ({
        ...s,
        solicitudes_disponibles: data || [],
      }));
      return data || [];
    } catch (err) {
      console.error('getHistorialFletero catch:', err);
      return null;
    } finally {
      this._state.update((s) => ({ ...s, loading: false }));
    }
  }
  /**
   * Obtiene el historial de viajes del fletero actual
   * Filtra las solicitudes donde el transportista es el usuario logueado
   * @returns Array de solicitudes del fletero
   */
  async getHistorialFletero(): Promise<Solicitud[] | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true, error: false }));

      const {
        data: { session },
      } = await this._authService.session();

      if (!session?.user?.id) {
        console.warn('Usuario no autenticado');
        return null;
      }

      // Obtener solicitudes del transportista usando la vista
      const { data, error } = await this._supabaseClient
        .from('v_solicitudes_transportista')
        .select(
          `
    *,
    localidad_origen:localidad_origen_id(localidad_id,nombre,provincia,codigo_postal),
    localidad_destino:localidad_destino_id(localidad_id,nombre,provincia,codigo_postal),
    presupuesto:presupuesto_aceptado (
      presupuesto_id,
      transportista:transportista_id (
        transportista_id,
        total_calificaciones,
        cantidad_calificaciones,
        usuario:usuario_id (
          usuario_id,
          nombre,
          apellido
        )
      )
    )
  `,
        )
        .eq('transportista_uuid', session.user.id)
        .returns<Solicitud[]>();

      if (error) {
        console.error('Error obteniendo historial del fletero:', error);
        return null;
      }

      console.log(
        ' Historial de viajes del transportista:',
        data?.length || 0,
        'solicitudes encontradas',
      );
      return data || [];
    } catch (err) {
      console.error('getHistorialFletero catch:', err);
      return null;
    } finally {
      this._state.update((s) => ({ ...s, loading: false }));
    }
  }

  /**
   * Obtiene todas las fotos de una solicitud desde la tabla fotos
   * @param solicitudId ID de la solicitud
   * @returns Array de fotos ordenadas
   */
  async getFotosBySolicitudId(solicitudId: number): Promise<any[]> {
    try {
      const { data, error } = await this._supabaseClient
        .from('fotos')
        .select('*')
        .eq('solc_id', solicitudId)
        .order('orden', { ascending: true });

      if (error) {
        console.error('Error obteniendo fotos:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error en getFotosBySolicitudId:', err);
      return [];
    }
  }
}
