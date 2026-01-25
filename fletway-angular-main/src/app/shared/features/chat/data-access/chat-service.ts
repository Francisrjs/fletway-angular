import { inject, Injectable, signal, effect } from '@angular/core';
import {
  Mensaje,
  MensajeConUsuario,
  MensajeCreate,
} from '../../../../core/layouts/mensaje';
import { Supabase } from '../../../data-access/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatState {
  mensajes: MensajeConUsuario[];
  loading: boolean;
  error: boolean;
  solicitudIdActual: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private _supabaseClient = inject(Supabase).supabaseCLient;
  private _realtimeChannel: RealtimeChannel | null = null;

  // State con Signals
  private _state = signal<ChatState>({
    mensajes: [],
    loading: false,
    error: false,
    solicitudIdActual: null,
  });

  // Signals públicos
  public mensajes = this._state.asReadonly();
  public loading = () => this._state().loading;
  public error = () => this._state().error;

  /**
   * Carga mensajes de una solicitud y se suscribe en tiempo real
   */
  async cargarMensajes(
    solicitudId: number,
    currentUserId: string,
  ): Promise<void> {
    try {
      console.log('💬 Cargando mensajes para solicitud:', solicitudId);
      this._state.update((s) => ({
        ...s,
        loading: true,
        error: false,
        solicitudIdActual: solicitudId,
      }));

      // Desuscribirse del canal anterior si existe
      this.desuscribirseRealtimeChat();

      // Cargar mensajes existentes
      const { data, error } = await this._supabaseClient
        .from('mensajes')
        .select('*')
        .eq('solic_id', solicitudId)
        .is('deleted_at', null) // Solo mensajes no eliminados
        .order('created_at', { ascending: true })
        .returns<Mensaje[]>();

      if (error) {
        console.error('❌ Error cargando mensajes:', error);
        this._state.update((s) => ({ ...s, error: true, loading: false }));
        return;
      }

      // Transformar mensajes con flag esMio
      const mensajesConUsuario: MensajeConUsuario[] = (data || []).map((m) => ({
        ...m,
        esMio: m.user_id === currentUserId,
      }));

      this._state.update((s) => ({
        ...s,
        mensajes: mensajesConUsuario,
        loading: false,
      }));

      // Suscribirse a cambios en tiempo real
      this.suscribirseRealtimeChat(solicitudId, currentUserId);
    } catch (err) {
      console.error('❌ Error en cargarMensajes:', err);
      this._state.update((s) => ({ ...s, error: true, loading: false }));
    }
  }

  /**
   * Envía un nuevo mensaje
   */
  async enviarMensaje(
    solicitudId: number,
    mensaje: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const nuevoMensaje: MensajeCreate = {
        solic_id: solicitudId,
        mensaje: mensaje.trim(),
        user_id: userId,
      };

      // Insertar mensaje y retornar el mensaje creado
      const { data, error } = await this._supabaseClient
        .from('mensajes')
        .insert(nuevoMensaje)
        .select()
        .single();

      if (error) {
        console.error('❌ Error enviando mensaje:', error);
        return false;
      }

      console.log('✅ Mensaje enviado correctamente');

      // 🔥 ACTUALIZACIÓN INMEDIATA: Agregar el mensaje al estado sin esperar realtime
      if (data) {
        const mensajeConUsuario: MensajeConUsuario = {
          ...data,
          esMio: data.user_id === userId,
        };

        this._state.update((s) => ({
          ...s,
          mensajes: [...s.mensajes, mensajeConUsuario],
        }));

        console.log('🔔 Mensaje agregado inmediatamente al estado local');
      }

      return true;
    } catch (err) {
      console.error('❌ Error en enviarMensaje:', err);
      return false;
    }
  }

  /**
   * Edita un mensaje existente
   */
  async editarMensaje(mensajeId: number, nuevoTexto: string): Promise<boolean> {
    try {
      const { error } = await this._supabaseClient
        .from('mensajes')
        .update({
          mensaje: nuevoTexto.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq('id', mensajeId);

      if (error) {
        console.error('❌ Error editando mensaje:', error);
        return false;
      }

      console.log('✅ Mensaje editado correctamente');
      return true;
    } catch (err) {
      console.error('❌ Error en editarMensaje:', err);
      return false;
    }
  }

  /**
   * Elimina un mensaje (soft delete)
   */
  async eliminarMensaje(mensajeId: number): Promise<boolean> {
    try {
      const { error } = await this._supabaseClient
        .from('mensajes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', mensajeId);

      if (error) {
        console.error('❌ Error eliminando mensaje:', error);
        return false;
      }

      console.log('✅ Mensaje eliminado correctamente');

      // Remover del state local
      this._state.update((s) => ({
        ...s,
        mensajes: s.mensajes.filter((m) => m.id !== mensajeId),
      }));

      return true;
    } catch (err) {
      console.error('❌ Error en eliminarMensaje:', err);
      return false;
    }
  }

  /**
   * Suscripción en tiempo real a los mensajes de una solicitud
   */
  private suscribirseRealtimeChat(
    solicitudId: number,
    currentUserId: string,
  ): void {
    this._realtimeChannel = this._supabaseClient
      .channel(`mensajes-solicitud-${solicitudId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensajes',
          filter: `solic_id=eq.${solicitudId}`,
        },
        (payload) => {
          console.log('🔔 Cambio en tiempo real:', payload);

          if (payload.eventType === 'INSERT') {
            const nuevoMensaje = payload.new as Mensaje;

            // 🔥 Verificar si el mensaje ya existe (prevenir duplicados de actualización inmediata)
            const yaExiste = this._state().mensajes.some(
              (m) => m.id === nuevoMensaje.id,
            );
            if (yaExiste) {
              console.log(
                '⚠️ Mensaje ya existe en el estado, ignorando evento INSERT de realtime',
              );
              return;
            }

            const mensajeConUsuario: MensajeConUsuario = {
              ...nuevoMensaje,
              esMio: nuevoMensaje.user_id === currentUserId,
            };

            this._state.update((s) => ({
              ...s,
              mensajes: [...s.mensajes, mensajeConUsuario],
            }));

            console.log('🔔 Mensaje agregado desde realtime (otro usuario)');
          } else if (payload.eventType === 'UPDATE') {
            const mensajeActualizado = payload.new as Mensaje;

            this._state.update((s) => ({
              ...s,
              mensajes: s.mensajes.map((m) =>
                m.id === mensajeActualizado.id
                  ? { ...mensajeActualizado, esMio: m.esMio }
                  : m,
              ),
            }));
          } else if (payload.eventType === 'DELETE') {
            const mensajeEliminado = payload.old as Mensaje;

            this._state.update((s) => ({
              ...s,
              mensajes: s.mensajes.filter((m) => m.id !== mensajeEliminado.id),
            }));
          }
        },
      )
      .subscribe();

    console.log(
      '🔔 Suscrito a mensajes en tiempo real para solicitud:',
      solicitudId,
    );
  }

  /**
   * Desuscribirse del canal de tiempo real
   */
  desuscribirseRealtimeChat(): void {
    if (this._realtimeChannel) {
      this._supabaseClient.removeChannel(this._realtimeChannel);
      this._realtimeChannel = null;
      console.log('🔕 Desuscrito de mensajes en tiempo real');
    }
  }

  /**
   * Limpia el estado del chat
   */
  limpiarChat(): void {
    this.desuscribirseRealtimeChat();
    this._state.update((s) => ({
      ...s,
      mensajes: [],
      solicitudIdActual: null,
    }));
  }
}
