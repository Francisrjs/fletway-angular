import { Injectable, inject } from '@angular/core';
import { Supabase } from '../../shared/data-access/supabase';

// ✅ CORRECCIÓN: Agregamos 'provincia' y 'codigo_postal' a la interfaz
export interface Localidad {
  localidad_id: number;
  nombre: string;
  provincia: string;      // Nuevo campo requerido
  codigo_postal?: string; // Opcional
}

@Injectable({
  providedIn: 'root'
})
export class LocalidadService {
  private _supabaseClient = inject(Supabase).supabaseCLient;

  /**
   * Busca localidades por nombre (búsqueda parcial)
   */
  async buscarLocalidades(termino: string): Promise<Localidad[]> {
    try {
      const { data, error } = await this._supabaseClient
        .from('localidad')
        // ✅ CORRECCIÓN: Traemos provincia y código postal de la BD
        .select('localidad_id, nombre, provincia, codigo_postal')
        .ilike('nombre', `%${termino}%`)
        .order('nombre', { ascending: true })
        .limit(20);

      if (error) {
        console.error('Error al buscar localidades:', error);
        throw error;
      }

      return (data || []) as Localidad[];
    } catch (error) {
      console.error('Error en buscarLocalidades:', error);
      throw error;
    }
  }

  /**
   * Asocia múltiples localidades a un transportista
   */
  async asociarLocalidadesTransportista(
    transportistaId: number,
    localidadIds: number[]
  ): Promise<void> {
    try {
      const registros = localidadIds.map(localidadId => ({
        transportista_id: transportistaId,
        localidad_id: localidadId
      }));

      const { error } = await this._supabaseClient
        .from('transportista_localidad')
        .insert(registros);

      if (error) {
        console.error('Error al asociar localidades:', error);
        throw error;
      }

      console.log(`✅ ${localidadIds.length} localidades asociadas al transportista ${transportistaId}`);
    } catch (error) {
      console.error('Error en asociarLocalidadesTransportista:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las localidades asociadas a un transportista
   */
  /**
   * Obtiene todas las localidades asociadas a un transportista
   * (Método robusto en 2 pasos para evitar errores de relaciones FK)
   */
  async obtenerLocalidadesTransportista(transportistaId: number): Promise<Localidad[]> {
    try {
      // Paso 1: Obtener solo los IDs de la tabla intermedia
      const { data: relaciones, error: errorRel } = await this._supabaseClient
        .from('transportista_localidad')
        .select('localidad_id')
        .eq('transportista_id', transportistaId);

      if (errorRel) {
        console.error('Error al obtener IDs de localidades:', errorRel);
        throw errorRel;
      }

      const ids = relaciones?.map((r: any) => r.localidad_id) || [];

      if (ids.length === 0) return [];

      // Paso 2: Obtener los detalles completos de esas localidades
      const { data: localidades, error: errorLoc } = await this._supabaseClient
        .from('localidad')
        .select('localidad_id, nombre, provincia, codigo_postal')
        .in('localidad_id', ids);

      if (errorLoc) {
        console.error('Error al obtener detalles de localidades:', errorLoc);
        throw errorLoc;
      }

      return (localidades || []) as Localidad[];
    } catch (error) {
      console.error('Error en obtenerLocalidadesTransportista:', error);
      throw error;
    }
  }

  /**
   * Actualiza las localidades de un transportista
   */
  async actualizarLocalidadesTransportista(
    transportistaId: number,
    localidadIds: number[]
  ): Promise<void> {
    try {
      // 1. Eliminar anteriores
      const { error: deleteError } = await this._supabaseClient
        .from('transportista_localidad')
        .delete()
        .eq('transportista_id', transportistaId);

      if (deleteError) throw deleteError;

      // 2. Agregar nuevas
      if (localidadIds.length > 0) {
        await this.asociarLocalidadesTransportista(transportistaId, localidadIds);
      }
    } catch (error) {
      console.error('Error en actualizarLocalidadesTransportista:', error);
      throw error;
    }
  }

  /**
   * Elimina una localidad específica
   */
  async eliminarLocalidadTransportista(
    transportistaId: number,
    localidadId: number
  ): Promise<void> {
    try {
      const { error } = await this._supabaseClient
        .from('transportista_localidad')
        .delete()
        .eq('transportista_id', transportistaId)
        .eq('localidad_id', localidadId);

      if (error) throw error;
    } catch (error) {
      console.error('Error en eliminarLocalidadTransportista:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las localidades disponibles
   */
  async obtenerTodasLocalidades(): Promise<Localidad[]> {
    try {
      const { data, error } = await this._supabaseClient
        .from('localidad')
        // ✅ CORRECCIÓN: Traemos todos los campos
        .select('localidad_id, nombre, provincia, codigo_postal')
        .order('nombre', { ascending: true });

      if (error) throw error;

      return (data || []) as Localidad[];
    } catch (error) {
      console.error('Error en obtenerTodasLocalidades:', error);
      throw error;
    }
  }
}