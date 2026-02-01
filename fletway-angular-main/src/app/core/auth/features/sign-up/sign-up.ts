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
import { Cliente } from '../../../layouts/cliente';

// Tipado del formulario (incluye los campos extra)
interface signUpForm {
  nombre: FormControl<string | null>;
  apellido: FormControl<string | null>;
  fecha_nacimiento: FormControl<string | null>;
  telefono: FormControl<string | null>;
  email: FormControl<string | null>;
  password: FormControl<string | null>;
  confirmPassword: FormControl<string | null>;
  tipoUsuario: FormControl<string | null>;
  vehiculo: FormControl<string | null>;
  patente: FormControl<string | null>;
  capacidad_kg: FormControl<number | null>;
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
  private passwordMatchValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
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
      nombre: this._fb.control(null, [Validators.required]),
      apellido: this._fb.control(null, [Validators.required]),
      fecha_nacimiento: this._fb.control(null, [Validators.required]),
      telefono: this._fb.control(null, [Validators.required]),
      email: this._fb.control(null, [Validators.required, Validators.email]),
      password: this._fb.control(null, [
        Validators.required,
        Validators.minLength(6),
      ]),
      confirmPassword: this._fb.control(null, Validators.required),
      tipoUsuario: this._fb.control('', Validators.required),

      // campos fletero: empiezan deshabilitados
      vehiculo: this._fb.control({ value: null, disabled: true }),
      patente: this._fb.control({ value: null, disabled: true }),
      capacidad_kg: this._fb.control({ value: null, disabled: true }),
    },
    { validators: this.passwordMatchValidator },
  );

  constructor() {
    // Suscribimos cambios de tipoUsuario para habilitar/deshabilitar campos
    const sub = this.form.get('tipoUsuario')?.valueChanges.subscribe((v) => {
      const veh = this.form.get('vehiculo');
      const pat = this.form.get('patente');
      const cap = this.form.get('capacidad_kg');

      if (v === 'fletero') {
        // habilitar y validar
        veh?.setValidators([Validators.required]);
        veh?.enable();
        veh?.updateValueAndValidity();

        pat?.setValidators([Validators.required]);
        pat?.enable();
        pat?.updateValueAndValidity();

        cap?.setValidators([Validators.required, Validators.min(0)]);
        cap?.enable();
        cap?.updateValueAndValidity();
      } else {
        // limpiar, quitar validadores y deshabilitar
        veh?.clearValidators();
        veh?.setValue(null);
        veh?.disable();
        veh?.updateValueAndValidity();
        pat?.clearValidators();
        pat?.setValue(null);
        pat?.disable();
        pat?.updateValueAndValidity();
        cap?.clearValidators();
        cap?.setValue(null);
        cap?.disable();
        cap?.updateValueAndValidity();
      }
    });

    if (sub) this._subs.add(sub);
  }

  async submit() {
    if (this.form.invalid) {
      console.warn('❌ Formulario inválido:', this.form.errors);
      return;
    }

    const formData = this.form.value;

    try {
      console.log('🔐 Iniciando registro con email:', formData.email);

      // 1️⃣ Crear usuario en Supabase Auth
      const { data: authData, error: authError } =
        await this._authService.signUp({
          email: formData.email ?? '',
          password: formData.password ?? '',
        });

      if (authError) {
        console.error('❌ Error en Supabase Auth:', authError);
        throw authError;
      }

      const userId = authData?.user?.id;
      if (!userId) {
        throw new Error('No se obtuvo ID de usuario de Supabase Auth');
      }

      console.log('✅ Usuario autenticado en Supabase:', userId);

      // 2️⃣ Crear usuario en tabla 'usuario'
      // Nota: Supabase Auth hashea la contraseña automáticamente, pero necesitamos pasar la contraseña sin hash
      // para que la BD la almacene (en producción, usar RLS y triggers para sincronizar)
      const usuarioCreado = await this._authService.crearUsuario(
        formData.nombre ?? '',
        formData.apellido ?? '',
        formData.email ?? '',
        formData.telefono ?? '',
        formData.fecha_nacimiento ?? '',
        userId,
        formData.password ?? '', // Pasar la contraseña sin hash (será hasheada por la BD o trigger)
      );

      console.log('✅ Usuario creado en BD:', usuarioCreado);

      // 3️⃣ Si es fletero, crear perfil en tabla 'transportista'
      if (formData.tipoUsuario === 'fletero') {
        if (!usuarioCreado.usuario_id) {
          throw new Error('usuario_id no disponible para crear fletero');
        }

        await this._authService.crearFletero(
          usuarioCreado.usuario_id,
          formData.vehiculo ?? '',
          formData.capacidad_kg ?? 0,
          formData.patente ?? '',
          '', // modelo_vehiculo (opcional)
        );

        console.log('✅ Perfil de fletero creado');
        console.log('🎉 Registro completado, redirigiendo a /fletero...');
        await this._router.navigateByUrl('/fletero');
      } else {
        console.log('🎉 Registro completado, redirigiendo a /cliente...');
        await this._router.navigateByUrl('/cliente');
      }
    } catch (err) {
      console.error('❌ Error en registro:', err);
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }
}
