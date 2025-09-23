import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, SignInWithPasswordCredentials } from '@supabase/supabase-js';

import { Supabase } from '../../../shared/data-access/supabase';
export interface userState {
  userId: string | null;
  email?: string | null;
  isFletero?: boolean | null;
  isFleteroLoading?: boolean;
  session?: Session | null;
}
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _supabaseClient = inject(Supabase).supabaseCLient;
  private _router = inject(Router);
  userState = signal<userState>({
    userId: null,
    email: null,
    isFletero: null,
    isFleteroLoading: false,
    session: null,
  });
  isLoggingOut = signal<boolean>(false);
  //Cada vez que se actualiza el sign in o signout, escucha los cambios
  // esta suscrito a estos cambios
  constructor() {
    this._supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      console.log('[onAuthStateChange] event:', _event, 'session:', session);
      console.log('userState (antes):', this.userState());
      if (session?.user) {
        const userId = session.user.id;
        const email = session.user.email ?? null;
        // Solo setear isFletero: null si el usuario cambió
        const prev = this.userState();
        const shouldReset = prev.userId !== userId;
        this.userState.set({
          userId,
          email,
          isFletero: shouldReset ? null : prev.isFletero,
          isFleteroLoading: true,
          session,
        });
        console.log(
          '[onAuthStateChange] userState set (preliminar):',
          this.userState(),
        );
        // 2) Calcular isFletero en background y actualizar
        try {
          const isFletero = await this.esFletero(userId);
          this.userState.update((prev) => ({
            ...prev,
            isFletero,
            isFleteroLoading: false,
          }));
          console.log(
            '[onAuthStateChange] userState actualizado isFletero:',
            this.userState(),
          );
        } catch (e) {
          this.userState.update((prev) => ({
            ...prev,
            isFletero: false,
            isFleteroLoading: false,
          }));
          console.warn('esFletero fallo:', e);
        }
      } else {
        this.userState.set({
          userId: null,
          email: null,
          isFletero: null,
          session: null,
        });
        console.log('[onAuthStateChange] userState reset:', this.userState());
      }
    });
  }
  session() {
    return this._supabaseClient.auth.getSession();
  }
  signUp(credentials: SignInWithPasswordCredentials) {
    return this._supabaseClient.auth.signUp(credentials);
  }

  async loginIn(credentials: SignInWithPasswordCredentials) {
    console.log('[loginIn] credentials:', credentials);
    const result =
      await this._supabaseClient.auth.signInWithPassword(credentials);
    console.log('[loginIn] result:', result);
    return result;
  }

  async signOut(options?: { timeoutMs?: number }): Promise<boolean> {
    const timeoutMs = options?.timeoutMs ?? 4000;
    this.isLoggingOut.set(true);

    // 1) Limpiar estado local al instante
    this.userState.set({
      userId: null,
      email: null,
      isFletero: null,
      session: null,
    });
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (storageError) {
      console.warn('No se pudo limpiar el storage:', storageError);
    }

    // 2) Disparar signOut LOCAL en background (no bloquear)
    setTimeout(() => {
      this._supabaseClient.auth
        .signOut({ scope: 'local' })
        .catch((e) => console.warn('[signOut] error local:', e));
    }, 0);

    // 3) Intento de revoke GLOBAL en segundo plano con timeout (no bloquea)
    setTimeout(() => {
      Promise.race([
        this._supabaseClient.auth.signOut(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('signOut timeout')), timeoutMs),
        ),
      ])
        .then(() => console.log('2-Se deslogeo completamente (global revoke)'))
        .catch((e) => console.warn('[signOut] revoke global no confirmado:', e))
        .finally(() => this.isLoggingOut.set(false));
    }, 0);

    // Devolvemos inmediatamente; el UI no se bloquea
    return true;
  }
  async esFletero(userId: string): Promise<boolean | null> {
    // Si ya está cargando, evita recalcular
    if (this.userState().isFleteroLoading) return null;
    this.userState.update((prev) => ({ ...prev, isFleteroLoading: true }));
    const { data, error } = await this._supabaseClient.rpc('es_fletero', {
      uuid_param: userId,
    });
    if (error) {
      console.error('Error RPC es_fletero:', error);
      this.userState.update((prev) => ({ ...prev, isFleteroLoading: false }));
      return null;
    }
    let result = false;
    if (typeof data === 'boolean') {
      result = data;
    } else if (Array.isArray(data)) {
      result = !!(data[0]?.es_fletero === true);
    } else if (data && typeof data === 'object' && 'es_fletero' in data) {
      result = !!(data.es_fletero === true);
    }
    this.userState.update((prev) => ({
      ...prev,
      isFletero: result,
      isFleteroLoading: false,
    }));
    return result;
  }
}
