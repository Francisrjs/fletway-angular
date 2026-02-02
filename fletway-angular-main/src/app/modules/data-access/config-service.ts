import { Injectable, inject } from '@angular/core';
import { Supabase } from '../../shared/data-access/supabase';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private _supabaseClient = inject(Supabase).supabaseCLient;

  // 1. Obtener perfil básico (Cliente)
  async getPerfilUsuario(userId: string) {
    const { data, error } = await this._supabaseClient
      .from('usuario')
      .select('*')
      .eq('u_id', userId)
      .single();
    return data;
  }

  // 2. Actualizar perfil básico
  async actualizarPerfilUsuario(datos: any) {
    const { data: { user } } = await this._supabaseClient.auth.getUser();
    if(!user) throw new Error("No user");

    return await this._supabaseClient
      .from('usuario')
      .update(datos)
      .eq('u_id', user.id);
  }

  // 3. Obtener perfil Fletero (SIN LOCALIDADES, solo datos perfil)
  async getPerfilFleteroCompleto(userId: string) {
    // A. Obtener usuario
    const { data: usuario, error: userError } = await this._supabaseClient
      .from('usuario')
      .select('*')
      .eq('u_id', userId)
      .single();

    if (userError || !usuario) return null;

    // B. Obtener transportista
    // Usamos maybeSingle() para que no lance error si es nuevo y aún no tiene ficha
    const { data: transportista } = await this._supabaseClient
      .from('transportista')
      .select('*')
      .eq('usuario_id', usuario.usuario_id)
      .maybeSingle();

    // Retornamos solo los datos planos. Las localidades las pediremos aparte.
    return { usuario, transportista };
  }

  // 4. Actualizar Fletero (Datos + Localidades)
  // En config-service.ts

  async actualizarPerfilFletero(datosUser: any, datosTransp: any, idsLocalidades: number[]) {
    console.log("1. Iniciando actualización...", { datosUser, datosTransp, idsLocalidades });

    const { data: { user } } = await this._supabaseClient.auth.getUser();
    if(!user) throw new Error("Usuario no autenticado");

    // A. Update Usuario
    const { data: userUpdated, error: userError } = await this._supabaseClient
      .from('usuario')
      .update(datosUser)
      .eq('u_id', user.id)
      .select('usuario_id')
      .single();

    if (userError) {
      console.error("❌ Error actualizando USUARIO:", userError); // <--- MIRA ESTO EN CONSOLA
      throw userError;
    }

    // B. Update Transportista
    const { data: transpUpdated, error: transpError } = await this._supabaseClient
      .from('transportista')
      .update(datosTransp)
      .eq('usuario_id', userUpdated.usuario_id)
      .select('transportista_id')
      .single();

    if (transpError) {
      console.error("❌ Error actualizando TRANSPORTISTA:", transpError); // <--- MIRA ESTO EN CONSOLA
      // Tip común: Verifica que los nombres de las columnas en 'datosTransp' existan en la tabla
      throw transpError;
    }

    // C. Actualizar Localidades
    const t_id = transpUpdated.transportista_id;

    // 1. Borrar anteriores
    const { error: deleteError } = await this._supabaseClient
      .from('transportista_localidad')
      .delete()
      .eq('transportista_id', t_id);

    if (deleteError) {
      console.error("❌ Error BORRANDO localidades:", deleteError);
      throw deleteError;
    }

    // 2. Insertar nuevas
    if (idsLocalidades.length > 0) {
      const nuevasRelaciones = idsLocalidades.map(loc_id => ({
        transportista_id: t_id,
        localidad_id: loc_id
      }));

      const { error: insertError } = await this._supabaseClient
        .from('transportista_localidad')
        .insert(nuevasRelaciones);

      if (insertError) {
        console.error("❌ Error INSERTANDO localidades:", insertError);
        console.log("Datos que intentamos insertar:", nuevasRelaciones);
        throw insertError;
      }
    }

    return true;
  }
}