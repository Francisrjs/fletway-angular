import { Injectable } from '@angular/core';
import { environment } from '../../../enviroments/enviroment';
import {
  AuthChangeEvent,
  AuthSession,
  createClient,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
@Injectable({
  providedIn: 'root',
})
export class Supabase {
  supabaseCLient: SupabaseClient;

  constructor() {
    this.supabaseCLient = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
  }
}
