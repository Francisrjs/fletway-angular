import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../data-access/auth-service';

// Tipado del formulario (incluye los campos extra)
interface signUpForm {
  email: FormControl<string | null>;
  password: FormControl<string | null>;
  confirmPassword: FormControl<string | null>;
  tipoUsuario: FormControl<string | null>;
  descripcion: FormControl<string | null>;
  vehiculo: FormControl<string | null>;
  patente: FormControl<string | null>;
}

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './sign-up.html',
  styleUrls: ['./sign-up.scss'],
})
export class SignUp implements OnDestroy {
  private _fb = inject(FormBuilder);
  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _subs = new Subscription();

  // Validador personalizado a nivel de grupo
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    if (password && confirm && password !== confirm) {
      return { passwordMismatch: true };
    }
    return null;
  }

  // FormGroup: incluimos los campos extras pero deshabilitados inicialmente
  form = this._fb.group<signUpForm>(
    {
      email: this._fb.control(null, [Validators.required, Validators.email]),
      password: this._fb.control(null, [Validators.required, Validators.minLength(6)]),
      confirmPassword: this._fb.control(null, Validators.required),
      tipoUsuario: this._fb.control('', Validators.required),

      // campos fletero: empiezan deshabilitados
      descripcion: this._fb.control({ value: null, disabled: true }),
      vehiculo: this._fb.control({ value: null, disabled: true }),
      patente: this._fb.control({ value: null, disabled: true }),
    },
    { validators: this.passwordMatchValidator }
  );

  constructor() {
    // Suscribimos cambios de tipoUsuario para habilitar/deshabilitar campos
    const sub = this.form.get('tipoUsuario')?.valueChanges.subscribe((v) => {
      const desc = this.form.get('descripcion');
      const veh = this.form.get('vehiculo');
      const pat = this.form.get('patente');

      if (v === 'fletero') {
        // habilitar y validar
        desc?.setValidators([Validators.required]);
        desc?.enable();
        desc?.updateValueAndValidity();

        veh?.setValidators([Validators.required]);
        veh?.enable();
        veh?.updateValueAndValidity();

        pat?.setValidators([Validators.required]);
        pat?.enable();
        pat?.updateValueAndValidity();
      } else {
        // limpiar, quitar validadores y deshabilitar
        desc?.clearValidators(); desc?.setValue(null); desc?.disable(); desc?.updateValueAndValidity();
        veh?.clearValidators();  veh?.setValue(null);  veh?.disable();  veh?.updateValueAndValidity();
        pat?.clearValidators();  pat?.setValue(null);  pat?.disable();  pat?.updateValueAndValidity();
      }
    });

    if (sub) this._subs.add(sub);
  }

  async submit() {
    if (this.form.invalid) {
      console.warn('Formulario inválido', this.form.errors, this.form.value);
      return;
    }

    try {
      const { error } = await this._authService.signUp({
        email: this.form.value.email ?? '',
        password: this.form.value.password ?? '',
      });
      if (error) throw error;
      this._router.navigateByUrl('');
    } catch (err) {
      console.error(err);
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }
}
