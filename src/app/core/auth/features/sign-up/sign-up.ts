import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../data-access/auth-service';
//tipado
interface signUpForm {
  email: FormControl<null | string>;
  password: FormControl<null | string>;
  confirmPassword: FormControl<null | string>;
}
@Component({
  selector: 'app-sign-up',
  imports: [RouterLink, ReactiveFormsModule],
  standalone: true,
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
})
export class SignUp {
  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private _router = inject(Router);
  // --- Validador personalizado ---
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

  // --- Formulario con validadores ---
  form = this._formBuilder.group<signUpForm>(
    {
      email: this._formBuilder.control(null, [
        Validators.required,
        Validators.email,
      ]),
      password: this._formBuilder.control(null, [
        Validators.required,
        Validators.minLength(6),
      ]),
      confirmPassword: this._formBuilder.control(null, [Validators.required]),
    },
    {
      validators: this.passwordMatchValidator, // validación a nivel de grupo
    },
  );

  async submit() {
    if (this.form.invalid) {
      console.warn('Formulario inválido', this.form.errors, this.form.value);
      return;
    }

    try {
      const { error, data } = await this._authService.signUp({
        email: this.form.value.email ?? '',
        password: this.form.value.password ?? '',
      });
      if (error) throw error;
      console.log(data);
      this._router.navigateByUrl('');
    } catch (error) {
      console.error(error);
    }
  }
}
