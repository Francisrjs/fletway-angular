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

  // Métodos para persistencia en localStorage
  private saveIsFleteroToStorage(userId: string, isFletero: boolean) {
    try {
      localStorage.setItem(`isFletero_${userId}`, JSON.stringify(isFletero));
      localStorage.setItem(
        `isFletero_${userId}_timestamp`,
        Date.now().toString(),
      );
    } catch (e) {
      console.warn('No se pudo guardar isFletero en localStorage:', e);
    }
  }

  private getIsFleteroFromStorage(userId: string): boolean | null {
    try {
      const stored = localStorage.getItem(`isFletero_${userId}`);
      const timestamp = localStorage.getItem(`isFletero_${userId}_timestamp`);

      if (!stored || !timestamp) return null;

      // Verificar que no sea muy antiguo (24 horas)
      const age = Date.now() - parseInt(timestamp);
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas

      if (age > maxAge) {
        // Limpiar datos antiguos
        this.clearIsFleteroFromStorage(userId);
        return null;
      }

      return JSON.parse(stored);
    } catch (e) {
      console.warn('No se pudo leer isFletero del localStorage:', e);
      return null;
    }
  }

  private clearIsFleteroFromStorage(userId: string) {
    try {
      localStorage.removeItem(`isFletero_${userId}`);
      localStorage.removeItem(`isFletero_${userId}_timestamp`);
    } catch (e) {
      console.warn('No se pudo limpiar isFletero del localStorage:', e);
    }
  }

  constructor() {
    this._supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      console.log('[onAuthStateChange] event:', _event, 'session:', session);
      console.log('userState (antes):', this.userState());

      if (session?.user) {
        const userId = session.user.id;
        const email = session.user.email ?? null;

        // Verificar si el usuario cambió
        const prev = this.userState();
        const shouldReset = prev.userId !== userId;

        // Intentar obtener isFletero del localStorage primero
        const cachedIsFletero = this.getIsFleteroFromStorage(userId);

        if (cachedIsFletero !== null && !shouldReset) {
          // Usar valor del cache
          this.userState.set({
            userId,
            email,
            isFletero: cachedIsFletero,
            isFleteroLoading: false,
            session,
          });
          console.log(
            '[onAuthStateChange] usando cache isFletero:',
            cachedIsFletero,
          );
        } else {
          // No hay cache o usuario cambió, consultar BD
          this.userState.set({
            userId,
            email,
            isFletero: shouldReset ? null : prev.isFletero,
            isFleteroLoading: true,
            session,
          });
          console.log('[onAuthStateChange] consultando BD para isFletero');

          try {
            const isFletero = await this.esFletero(userId);
            this.userState.update((prev) => ({
              ...prev,
              isFletero,
              isFleteroLoading: false,
            }));

            // Guardar en localStorage
            if (isFletero !== null) {
              this.saveIsFleteroToStorage(userId, isFletero);
            }

            console.log(
              '[onAuthStateChange] isFletero actualizado:',
              isFletero,
            );
          } catch (e) {
            this.userState.update((prev) => ({
              ...prev,
              isFletero: false,
              isFleteroLoading: false,
            }));
            console.warn('esFletero fallo:', e);
          }
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

    // Limpiar cache de isFletero
    const currentUserId = this.userState().userId;
    if (currentUserId) {
      this.clearIsFleteroFromStorage(currentUserId);
    }

    // Limpiar estado local al instante
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

    // Disparar signOut LOCAL en background
    setTimeout(() => {
      this._supabaseClient.auth
        .signOut({ scope: 'local' })
        .catch((e) => console.warn('[signOut] error local:', e));
    }, 0);

    // Intento de revoke GLOBAL con timeout
    setTimeout(() => {
      Promise.race([
        this._supabaseClient.auth.signOut(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('signOut timeout')), timeoutMs),
        ),
      ])
        .then(() => console.log('Se deslogeo completamente (global revoke)'))
        .catch((e) => console.warn('[signOut] revoke global no confirmado:', e))
        .finally(() => this.isLoggingOut.set(false));
    }, 0);

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

    // Guardar en localStorage para futuras recargas
    this.saveIsFleteroToStorage(userId, result);

    return result;
  }
}
