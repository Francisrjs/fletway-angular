import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../data-access/auth-service';
import { Router, RouterLink } from '@angular/router';

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

      alert('Inicio de sesión exitoso');
      this._router.navigateByUrl('/');
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
    }
  }
}
