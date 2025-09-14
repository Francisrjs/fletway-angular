import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../data-access/auth-service';
import { Router, RouterLink } from '@angular/router';
import { Supabase } from '../../../../shared/data-access/supabase';
import { Session } from '@supabase/supabase-js';

// Tipado del formulario
interface LoginForm {
  email: FormControl<null | string>;
  password: FormControl<null | string>;
}

@Component({
  selector: 'app-login-in',
  imports: [ReactiveFormsModule, RouterLink],
  standalone: true,
  templateUrl: './login-in.html',
  styleUrl: './login-in.scss',
})
export class LoginIn {
  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private _router = inject(Router);
  // --- Formulario con validadores ---
  form = this._formBuilder.group<LoginForm>({
    email: this._formBuilder.control(null, [
      Validators.required,
      Validators.email,
    ]),
    password: this._formBuilder.control(null, [Validators.required]),
  });

  async submit() {
    if (this.form.invalid) {
      console.warn('Formulario inválido', this.form.errors, this.form.value);
      return;
    }

    try {
      const authResponse = await this._authService.loginIn({
        email: this.form.value.email ?? '',
        password: this.form.value.password ?? '',
      });

      if (authResponse.error) throw authResponse.error;

      // Toma la sesión devuelta por Supabase, o consulta si no viene
      let session: Session | null = authResponse.data.session ?? null;
      if (!session) {
        const { data } = await this._authService.session();
        session = data.session ?? null;
      }

      if (!session || !session.user) {
        throw new Error('No se pudo obtener la sesión después de login');
      }

      const userId = session.user.id;
      const email = session.user.email ?? null;
      const isFletero = await this._authService.esFletero(userId);

      // Reflejar el estado para guards/UI
      this._authService.userState.set({ userId, email, isFletero, session });

      // Redirigir según rol
      const target = isFletero ? '/fletero' : '/cliente';
      await this._router.navigateByUrl(target);
      alert('Inicio de sesión exitoso');
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
    }
  }
}
