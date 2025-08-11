import { inject, Injectable } from '@angular/core';
import { Supabase } from '../../../shared/data-access/supabase';
import { SignInWithPasswordCredentials } from '@supabase/supabase-js';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _supabaseClient = inject(Supabase).supabaseCLient;
  private _router = inject(Router);
  //Escuchador de cambios
  constructor() {
    this._supabaseClient.auth.onAuthStateChange((session) => {
      console.log(session);
    });
  }
  session() {
    return this._supabaseClient.auth.getSession();
  }
  signUp(credentials: SignInWithPasswordCredentials) {
    return this._supabaseClient.auth.signUp(credentials);
  }

  loginIn(credentials: SignInWithPasswordCredentials) {
    return this._supabaseClient.auth.signInWithPassword(credentials);
  }

  async signOut() {
    const {
      data: { session },
    } = await this._supabaseClient.auth.getSession();
    if (session) {
      await this._supabaseClient.auth.signOut({ scope: 'local' });
    }
    // Limpia datos locales
    localStorage.clear();
    sessionStorage.clear();
  }
  async esFletero() {
    const {
      data: { session },
      error: sessionError,
    } = await this._supabaseClient.auth.getSession();

    if (sessionError) {
      console.error('Error obteniendo sesión:', sessionError);
      return null;
    }

    if (!session || !session.user) {
      console.warn('No hay usuario logueado');
      return null;
    }

    const userId = session.user.id;

    const { data, error } = await this._supabaseClient.rpc('es_fletero', {
      uuid_param: userId,
    });

    if (error) {
      console.error('Error RPC es_fletero:', error);
      return null;
    }

    console.log('Es fletero?', data);

    if (data === true) {
      this._router.navigate(['/fletero']);
    } else {
      this._router.navigate(['/cliente']);
    }

    return data;
  }
}
