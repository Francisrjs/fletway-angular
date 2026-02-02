import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfigService } from '../../data-access/config-service';// Ajusta la ruta si es necesario
import { ToastService } from '../../../shared/modal/toast/toast.service'; // Ajusta la ruta
import { AuthService } from '../../../core/auth/data-access/auth-service';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';


export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const pass = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    return pass && confirm && pass !== confirm ? { passwordMismatch: true } : null;
  };
}

@Component({
  selector: 'app-config-cliente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-cliente.html',
})
export class ConfigClienteComponent implements OnInit {
  private fb = inject(FormBuilder);
  private configService = inject(ConfigService);
  private toastService = inject(ToastService);
  private _authService = inject(AuthService);

  form: FormGroup;
  loading = true;
  submitting = false;

  passwordForm: FormGroup;
  submittingPassword = false;

  constructor() {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      telefono: ['', Validators.required],
      fecha_nacimiento: ['', Validators.required],
      email: [{ value: '', disabled: true }], // El email no se suele editar
    });

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: passwordMatchValidator() });

  }

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    try {
      this.loading = true;
      const { data: { session } } = await this._authService.session();

      if (session?.user) {
        // Aquí deberías tener un método en tu servicio para traer el perfil completo
        // Por ahora, asumimos que obtienes el perfil de la tabla 'usuario'
        const perfil = await this.configService.getPerfilUsuario(session.user.id);

        if (perfil) {
          this.form.patchValue({
            nombre: perfil.nombre,
            apellido: perfil.apellido,
            telefono: perfil.telefono,
            fecha_nacimiento: perfil.fecha_nacimiento,
            email: perfil.email
          });
        }
      }
    } catch (error) {
      console.error(error);
      this.toastService.showDanger('Error', 'No se pudieron cargar los datos');
    } finally {
      this.loading = false;
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;

    try {
      this.submitting = true;
      const { nombre, apellido, telefono, fecha_nacimiento } = this.form.value;

      // Llamada al servicio para actualizar
      await this.configService.actualizarPerfilUsuario({
        nombre, apellido, telefono, fecha_nacimiento
      });

      this.toastService.showSuccess('Éxito', 'Perfil actualizado correctamente');
    } catch (error) {
      console.error(error);
      this.toastService.showDanger('Error', 'No se pudo actualizar el perfil');
    } finally {
      this.submitting = false;
    }
  }


  async onUpdatePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    try {
      this.submittingPassword = true;
      const nuevaPass = this.passwordForm.get('password')?.value;

      await this._authService.cambiarContrasena(nuevaPass);

      this.toastService.showSuccess('Éxito', 'Tu contraseña ha sido actualizada');

      // Limpiamos el formulario para que no quede escrito
      this.passwordForm.reset();

    } catch (error: any) {
      console.error(error);
      this.toastService.showDanger('Error', error.message || 'No se pudo cambiar la contraseña');
    } finally {
      this.submittingPassword = false;
    }
  }
}