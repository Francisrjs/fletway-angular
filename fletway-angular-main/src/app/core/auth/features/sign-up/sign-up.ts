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
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { AuthService } from '../../data-access/auth-service';
import { LocalidadService, Localidad } from '../../../../modules/data-access/localidad-service';
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
  buscarLocalidad: FormControl<string | null>;
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
  private _localidadService = inject(LocalidadService);

  // Estado para localidades
  localidadesBuscadas: Localidad[] = [];
  localidadesSeleccionadas: Localidad[] = [];
  buscandoLocalidades = false;
  mostrarResultados = false;

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

  // Validador personalizado para localidades (al menos 1 si es fletero)
  //private localidadesValidator = (): ValidationErrors | null => {
  //  const tipoUsuario = this.form.get('tipoUsuario')?.value; //error here
  //  if (tipoUsuario === 'fletero' && this.localidadesSeleccionadas.length === 0) {
  //    return { localidadesRequeridas: true };
  //  }
  //  return null;
  //};
private localidadesValidator = (control: AbstractControl): ValidationErrors | null => {
  // CAMBIO AQUÍ: Usamos 'control' en lugar de 'this.form'
  const tipoUsuario = control.get('tipoUsuario')?.value;

  // 'this.localidadesSeleccionadas' sigue funcionando porque es una arrow function
  if (tipoUsuario === 'fletero' && this.localidadesSeleccionadas.length === 0) {
    return { localidadesRequeridas: true };
  }
  return null;
};

  // FormGroup: incluimos los campos extras pero deshabilitados inicialmente
  form = this._fb.group<signUpForm>(   //error
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
      buscarLocalidad: this._fb.control({ value: null, disabled: true }),
    },
    {
      validators: [this.passwordMatchValidator, this.localidadesValidator]
    },
  );

  constructor() {
    // Suscribimos cambios de tipoUsuario para habilitar/deshabilitar campos
    const subTipoUsuario = this.form.get('tipoUsuario')?.valueChanges.subscribe((v) => {
      const veh = this.form.get('vehiculo');
      const pat = this.form.get('patente');
      const cap = this.form.get('capacidad_kg');
      const buscar = this.form.get('buscarLocalidad');

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

        buscar?.enable();
        buscar?.updateValueAndValidity();
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

        buscar?.setValue(null);
        buscar?.disable();
        buscar?.updateValueAndValidity();

        // Limpiar localidades seleccionadas
        this.localidadesSeleccionadas = [];
        this.localidadesBuscadas = [];
        this.mostrarResultados = false;
      }
    });

    // Suscribirse a cambios en el campo de búsqueda de localidades
    const subBuscarLocalidad = this.form.get('buscarLocalidad')?.valueChanges
      .pipe(
        debounceTime(300), // Esperar 300ms después de que el usuario deje de escribir
        distinctUntilChanged() // Solo emitir si el valor cambió
      )
      .subscribe((termino) => {
        if (termino && termino.trim().length >= 2) {
          this.buscarLocalidades(termino.trim());
        } else {
          this.localidadesBuscadas = [];
          this.mostrarResultados = false;
        }
      });

    if (subTipoUsuario) this._subs.add(subTipoUsuario);
    if (subBuscarLocalidad) this._subs.add(subBuscarLocalidad);
  }

  async buscarLocalidades(termino: string): Promise<void> {
    this.buscandoLocalidades = true;
    try {
      const localidades = await this._localidadService.buscarLocalidades(termino);

      // Filtrar las localidades que ya están seleccionadas
      this.localidadesBuscadas = localidades.filter(
        (loc: Localidad) => !this.localidadesSeleccionadas.some((sel: Localidad) => sel.localidad_id === loc.localidad_id)
      );

      this.mostrarResultados = true;
    } catch (error) {
      console.error('Error al buscar localidades:', error);
      this.localidadesBuscadas = [];
    } finally {
      this.buscandoLocalidades = false;
    }
  }

  agregarLocalidad(localidad: Localidad): void {
    // Verificar que no esté ya agregada
    if (!this.localidadesSeleccionadas.some((loc: Localidad) => loc.localidad_id === localidad.localidad_id)) {
      this.localidadesSeleccionadas.push(localidad);

      // Remover de los resultados de búsqueda
      this.localidadesBuscadas = this.localidadesBuscadas.filter(
        (loc: Localidad) => loc.localidad_id !== localidad.localidad_id
      );

      // Limpiar el campo de búsqueda
      this.form.get('buscarLocalidad')?.setValue('', { emitEvent: false });
      this.mostrarResultados = false;

      // Actualizar validación del formulario
      this.form.updateValueAndValidity();
    }
  }

  quitarLocalidad(localidad: Localidad): void {
    this.localidadesSeleccionadas = this.localidadesSeleccionadas.filter(
      (loc: Localidad) => loc.localidad_id !== localidad.localidad_id
    );

    // Actualizar validación del formulario
    this.form.updateValueAndValidity();
  }

  // Cerrar dropdown al hacer clic fuera
  cerrarDropdown(): void {
    this.mostrarResultados = false;
  }

  async submit(): Promise<void> {
    // Validación adicional para fleteros
    if (this.form.get('tipoUsuario')?.value === 'fletero' && this.localidadesSeleccionadas.length === 0) {
      console.warn('⚠️ Debe seleccionar al menos una localidad');
      return;
    }

    if (this.form.invalid) {
      console.warn('⚠️ Formulario inválido:', this.form.errors);
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
      const usuarioCreado = await this._authService.crearUsuario(
        formData.nombre ?? '',
        formData.apellido ?? '',
        formData.email ?? '',
        formData.telefono ?? '',
        formData.fecha_nacimiento ?? '',
        userId,
        formData.password ?? '',
      );

      console.log('✅ Usuario creado en BD:', usuarioCreado);

      // 3️⃣ Si es fletero, crear perfil en tabla 'transportista'
      if (formData.tipoUsuario === 'fletero') {
        if (!usuarioCreado.usuario_id) {
          throw new Error('usuario_id no disponible para crear fletero');
        }

        const transportistaCreado = await this._authService.crearFletero(
          usuarioCreado.usuario_id,
          formData.vehiculo ?? '',
          formData.capacidad_kg ?? 0,
          formData.patente ?? '',
          '', // modelo_vehiculo (opcional)
        );

        console.log('✅ Perfil de fletero creado');

        // 4️⃣ Asociar localidades al transportista
        if (this.localidadesSeleccionadas.length > 0) {
          // Validar que transportista_id exista antes de usarlo
          if (!transportistaCreado?.transportista_id) {
            throw new Error('No se obtuvo transportista_id del fletero creado');
          }

          await this._localidadService.asociarLocalidadesTransportista(
            transportistaCreado.transportista_id,
            this.localidadesSeleccionadas.map((loc: Localidad) => loc.localidad_id)
          );
          console.log('✅ Localidades asociadas al transportista');
        }

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