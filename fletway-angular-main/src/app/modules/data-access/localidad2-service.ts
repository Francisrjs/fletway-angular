import { Injectable, inject } from '@angular/core';
import { Supabase } from '../../shared/data-access/supabase';

// Interfaz praa Localidad (definida aquí para evitar dependencias circulares)
export interface Localidad {
  localidad_id: number;
  nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocalidadService {
 // private supabase = inject(Supabase);
 // private supabaseClient = this.supabase.supabaseCLient;
  private _supabaseClient = inject(Supabase).supabaseCLient;

  /**
   * Busca localidades por nombre (búsqueda parcial)
   * @param termino - Término de búsqueda
   * @returns Array de localidades que coinciden con el término
   */
  async buscarLocalidades(termino: string): Promise<Localidad[]> {
    try {
      const { data, error } = await this._supabaseClient
        .from('localidad')
        .select('localidad_id, nombre')
        .ilike('nombre', `%${termino}%`) // Búsqueda case-insensitive
        .order('nombre', { ascending: true })
        .limit(20); // Limitar a 20 resultados

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
   * @param transportistaId - ID del transportista
   * @param localidadIds - Array de IDs de localidades
   */
  async asociarLocalidadesTransportista(
    transportistaId: number,
    localidadIds: number[]
  ): Promise<void> {
    try {
      // Crear los registros en la tabla muchos a muchos
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
   * @param transportistaId - ID del transportista
   * @returns Array de localidades del transportista
   */
  async obtenerLocalidadesTransportista(transportistaId: number): Promise<Localidad[]> {
    try {
      const { data, error } = await this._supabaseClient
        .from('transportista_localidad')
        .select(`
          localidad:localidad_id (
            localidad_id,
            nombre
          )
        `)
        .eq('transportista_id', transportistaId);

      if (error) {
        console.error('Error al obtener localidades del transportista:', error);
        throw error;
      }

      // Mapear los resultados para extraer las localidades
      return (data?.map((item: any) => item.localidad) || []) as Localidad[];
    } catch (error) {
      console.error('Error en obtenerLocalidadesTransportista:', error);
      throw error;
    }
  }

  /**
   * Actualiza las localidades de un transportista (elimina las anteriores y agrega las nuevas)
   * @param transportistaId - ID del transportista
   * @param localidadIds - Array de IDs de localidades nuevas
   */
  async actualizarLocalidadesTransportista(
    transportistaId: number,
    localidadIds: number[]
  ): Promise<void> {
    try {
      // 1. Eliminar todas las localidades anteriores
      const { error: deleteError } = await this._supabaseClient
        .from('transportista_localidad')
        .delete()
        .eq('transportista_id', transportistaId);

      if (deleteError) {
        console.error('Error al eliminar localidades anteriores:', deleteError);
        throw deleteError;
      }

      // 2. Agregar las nuevas localidades
      if (localidadIds.length > 0) {
        await this.asociarLocalidadesTransportista(transportistaId, localidadIds);
      }

      console.log(`✅ Localidades actualizadas para el transportista ${transportistaId}`);
    } catch (error) {
      console.error('Error en actualizarLocalidadesTransportista:', error);
      throw error;
    }
  }

  /**
   * Elimina una localidad específica de un transportista
   * @param transportistaId - ID del transportista
   * @param localidadId - ID de la localidad a eliminar
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

      if (error) {
        console.error('Error al eliminar localidad del transportista:', error);
        throw error;
      }

      console.log(`✅ Localidad ${localidadId} eliminada del transportista ${transportistaId}`);
    } catch (error) {
      console.error('Error en eliminarLocalidadTransportista:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las localidades disponibles
   * @returns Array de todas las localidades
   */
  async obtenerTodasLocalidades(): Promise<Localidad[]> {
    try {
      const { data, error } = await this._supabaseClient
        .from('localidad')
        .select('localidad_id, nombre')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error al obtener localidades:', error);
        throw error;
      }

      return (data || []) as Localidad[];
    } catch (error) {
      console.error('Error en obtenerTodasLocalidades:', error);
      throw error;
    }
  }
}
