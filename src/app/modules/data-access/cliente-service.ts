import { computed, inject, Injectable, signal } from '@angular/core';
import { Supabase } from '../../shared/data-access/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAuthClient } from '@supabase/supabase-js/dist/module/lib/SupabaseAuthClient';
import { AuthService } from '../../core/auth/data-access/auth-service';
import { Solicitud } from '../../core/layouts/solicitud';

@Injectable({
  providedIn: 'root',
})
export class ClienteService {}
