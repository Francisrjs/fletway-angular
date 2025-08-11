import { Injectable, inject, signal, computed } from '@angular/core';
import { Supabase } from '../../shared/data-access/supabase';
import { AuthService } from '../../core/auth/data-access/auth-service';
import { Solicitud } from '../../core/layouts/solicitud';

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
          localidad_origen:localidad_origen_id(localidad_id,nombre,provincia,codigo_postal)
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
          localidad_origen:localidad_origen_id(localidad_id,nombre,provincia,codigo_postal)
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
}
