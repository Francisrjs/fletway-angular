import { inject, Injectable, signal } from '@angular/core';
import { Presupuesto } from '../../core/layouts/presupuesto';
import { Supabase } from '../../shared/data-access/supabase';
import { Fletero } from '../../core/layouts/fletero';

interface PresupuestoState {
  presupuestos: Presupuesto[];
  loading: boolean;
  error: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PresupuestoService {
  private _supabaseClient = inject(Supabase).supabaseCLient;

  private _state = signal<PresupuestoState>({
    presupuestos: [],
    loading: false,
    error: false,
  });

  

  // 🔎 Filtrar presupuestos por solicitud_id
  async getPresupuestosBySolicitudId(solicitudId: number): Promise<Presupuesto[] | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true, error: false }));

      const { data, error } = await this._supabaseClient
        .from('presupuesto')
        .select('*')
        .eq('solicitud_id', solicitudId)
        .eq('estado', 'pendiente') // 👈 filtro
        .returns<Presupuesto[]>();

      if (error) {
        console.error('Supabase error:', error);
        this._state.update((s) => ({ ...s, error: true }));
        return null;
      }

      if (data) {
        this._state.update((s) => ({ ...s, presupuestos: data }));
      }

      return data ?? null;
    } catch (err) {
      console.error('getPresupuestosBySolicitudId catch:', err);
      this._state.update((s) => ({ ...s, error: true }));
      return null;
    } finally {
      this._state.update((s) => ({ ...s, loading: false }));
    }
  }




async aceptarPresupuesto(presupuestoId: number, solicitudId: number): Promise<boolean> {
  try {
    this._state.update((s) => ({ ...s, loading: true, error: false }));

    // 1️⃣ Rechazar todos los presupuestos de esa solicitud
    const { error: errorRechazo } = await this._supabaseClient
      .from('presupuesto')
      .update({ estado: 'rechazado' })
      .eq('solicitud_id', solicitudId);

    if (errorRechazo) {
      console.error('Error al rechazar presupuestos:', errorRechazo);
      return false;
    }

    // 2️⃣ Aceptar el presupuesto elegido
    const { error: errorAceptar } = await this._supabaseClient
      .from('presupuesto')
      .update({ estado: 'aceptado' })
      .eq('presupuesto_id', presupuestoId); // 👈 asegúrate que la PK sea "id"

    if (errorAceptar) {
      console.error('Error al aceptar presupuesto:', errorAceptar);
      return false;
    }

    // refrescamos la lista de presupuestos en memoria
    await this.getPresupuestosBySolicitudId(solicitudId);

    return true;
  } catch (err) {
    console.error('aceptarPresupuesto catch:', err);
    return false;
  } finally {
    this._state.update((s) => ({ ...s, loading: false }));
  }
}


async rechazarPresupuesto(presupuestoId: number, solicitudId: number): Promise<boolean> {
  try {
    this._state.update((s) => ({ ...s, loading: true, error: false }));

    const { error } = await this._supabaseClient
      .from('presupuesto')
      .update({ estado: 'rechazado' })
      .eq('presupuesto_id', presupuestoId);

    if (error) {
      console.error('Error al rechazar presupuesto:', error);
      return false;
    }

    // refrescar la lista de presupuestos
    await this.getPresupuestosBySolicitudId(solicitudId);

    return true;
  } catch (err) {
    console.error('rechazarPresupuesto catch:', err);
    return false;
  } finally {
    this._state.update((s) => ({ ...s, loading: false }));
  }
}

//h

async getFleteroById(fleteroId: number): Promise<Fletero | null> {
  try {
    this._state.update((s) => ({ ...s, loading: true, error: false }));

    // 1️⃣ Buscar transportista
    const { data: transportistaData, error: transportistaError } =
      await this._supabaseClient
        .from('transportista')
        .select('*')
        .eq('transportista_id', fleteroId)
        .single(); // esperamos un solo transportista

    if (transportistaError) {
      console.error('Supabase error transportista:', transportistaError);
      this._state.update((s) => ({ ...s, error: true }));
      return null;
    }

    if (!transportistaData) {
      return null;
    }

    // 2️⃣ Buscar usuario con el usuario_id del transportista
    const { data: usuarioData, error: usuarioError } =
      await this._supabaseClient
        .from('usuario')
        .select('*')
        .eq('usuario_id', transportistaData.usuario_id)
        .single();

    if (usuarioError) {
      console.error('Supabase error usuario:', usuarioError);
      this._state.update((s) => ({ ...s, error: true }));
      return null;
    }

    // 3️⃣ Combinar datos
    const fleteroCompleto: Fletero = {
      ...transportistaData,
      usuario: usuarioData
    };

    return fleteroCompleto;
  } catch (err) {
    console.error('getFleteroById catch:', err);
    this._state.update((s) => ({ ...s, error: true }));
    return null;
  } finally {
    this._state.update((s) => ({ ...s, loading: false }));
  }
}

}