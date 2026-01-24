import { inject, Injectable, signal } from '@angular/core';
import { Chat } from '../../../../core/layouts/chat';
import { Supabase } from '../../../data-access/supabase';
interface chatState {
  chats: Chat[];
  loading: boolean;
  error: boolean;
}
@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private _supabaseClient = inject(Supabase).supabaseCLient;
  private _state = signal<chatState>({
    chats: [],
    loading: false,
    error: false,
  });

  async getChatBySolicitud(solicitudId: number): Promise<Chat[] | null> {
    try {
      this._state.update((s) => ({ ...s, loading: true, error: false }));

      const { data, error } = await this._supabaseClient
        .from('chat')
        .select('*')
        .eq('solic_id', solicitudId)
        .order('created_at', { ascending: true })
        //.eq('estado', 'pendiente') // 👈 filtro -----> Comenté esta linea para que cuando se abran los presupuestos de una solicitud, se vea el presupuesto aceptado.
        .returns<Chat[]>(); //                   Siempre y cuando haya un presupuesto aceptado. Sino se mostraran todos los pendientes.

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
}
