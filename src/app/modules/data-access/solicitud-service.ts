import { computed,inject, Injectable, signal } from '@angular/core';

import { AuthService } from '../../core/auth/data-access/auth-service';
import { Localidad } from '../../core/layouts/localidad';
import { Solicitud } from '../../core/layouts/solicitud';
import { Supabase } from '../../shared/data-access/supabase';

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

  private _state = signal<SolicitudState>({
    solicitudes: [],
    loading: false,
    error: false,
  });

  // Exponer como computed/signals para que la UI pueda suscribirse si querés
  solicitudes = computed(() => this._state().solicitudes);
  loading = computed(() => this._state().loading);
  error = computed(() => this._state().error);

  // ahora devuelve la data y maneja errores
  async getAllPedidos(): Promise<Solicitud[] | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true, error: false }));

      const { data, error } = await this._supabaseClient
        .from('solicitud')
        .select(
          `
          solicitud_id,
          direccion_origen,
          direccion_destino,
          fecha_creacion,
          detalles_carga,
          estado,
          presupuesto_aceptado,
          creado_en,
          actualizado_en,
          cliente:cliente_id(u_id,email,nombre,apellido,telefono,usuario_id),
          localidad_origen:localidad_origen_id(localidad_id,nombre,provincia,codigo_postal),
          localidad_destino:localidad_destino_id(localidad_id,nombre,provincia,codigo_postal)
        `,
        )
        .returns<Solicitud[]>();

      if (error) {
        console.error('Supabase error:', error);
        this._state.update((s) => ({ ...s, error: true }));
        return null;
      }

      if (data) {
        // actualizo la propiedad correcta
        this._state.update((s) => ({ ...s, solicitudes: data }));
      }

      return data ?? null;
    } catch (err) {
      console.error('getAllPedidos catch:', err);
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
          solicitud_id,
          cliente_id,
          presupuesto_aceptado,
          localidad_origen_id,
          direccion_origen,
          direccion_destino,
          fecha_creacion,
          detalles_carga,
          estado,
          borrado_logico,
          creado_en,
          actualizado_en,
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

      return data ?? null;
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
        solicitud_id,
        cliente_id,
        presupuesto_aceptado,
        localidad_origen_id,
        direccion_origen,
        direccion_destino,
        fecha_creacion,
        detalles_carga,
        estado,
        borrado_logico,
        creado_en,
        actualizado_en,
        cliente:cliente_id(u_id,email,nombre,apellido,telefono,creado_en,usuario_id,actualizado_en,borrado_logico,fecha_registro,fecha_nacimiento),
        localidad_origen:localidad_origen_id(localidad_id,nombre,provincia,codigo_postal),
        localidad_destino:localidad_destino_id(localidad_id,nombre,provincia,codigo_postal)
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
  async getPedidoById(solicitudId: number | string): Promise<Solicitud | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true, error: false }));

      const { data, error } = await this._supabaseClient
        .from('solicitud')
        .select(
          `
        solicitud_id,
        cliente_id,
        presupuesto_aceptado,
        localidad_origen_id,
        direccion_origen,
        direccion_destino,
        fecha_creacion,
        detalles_carga,
        estado,
        borrado_logico,
        creado_en,
        actualizado_en,
        cliente:cliente_id(u_id,email,nombre,apellido,telefono,creado_en,usuario_id,actualizado_en,borrado_logico,fecha_registro,fecha_nacimiento),
        localidad_origen:localidad_origen_id(localidad_id,nombre,provincia,codigo_postal),
        localidad_destino:localidad_destino_id(localidad_id,nombre,provincia,codigo_postal)
      `,
        )
        .eq('solicitud_id', solicitudId)
        .maybeSingle() // devuelve null si no hay filas
        .returns<Solicitud>();

      if (error) {
        console.error('Supabase error (getPedidoById):', error);
        this._state.update((s) => ({ ...s, error: true }));
        return null;
      }

      return data ?? null;
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
      fecha_recogida?: string; // yyyy-mm-dd
      hora_recogida_time?: string; // HH:mm
      detalles_carga?: string;
      medidas?: string;
      peso?: number | null;
    },
    // files queda para compatibilidad pero lo ignoramos
    files?: FileList | null,
  ): Promise<{ data?: Solicitud | null; error?: any }> {
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

      const row: any = {
        cliente_id,
        direccion_origen: payload.direccion_origen,
        direccion_destino: payload.direccion_destino,
        detalles_carga: payload.detalles_carga ?? null,
        medidas: payload.medidas ?? null,
        estado: 'sin transportista',
        hora_recogida: hora_recogida_iso,
      };

      // si el payload trae localidad_origen_id, lo agregamos
      if ((payload as any).localidad_origen_id) {
        row.localidad_origen_id = (payload as any).localidad_origen_id;
      }

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
  async searchLocalidades(query: string): Promise<any[] | []> {
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
}
