import { inject, Injectable } from '@angular/core';
import { Supabase } from '../../../shared/data-access/supabase';
import { SignInWithPasswordCredentials } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _supabaseClient = inject(Supabase).supabaseCLient;
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

  signOut() {
    return this._supabaseClient.auth.signOut();
  }
}
