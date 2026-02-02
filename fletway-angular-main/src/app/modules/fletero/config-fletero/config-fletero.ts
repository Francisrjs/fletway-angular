import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfigService } from '../../data-access/config-service';// Ajusta la ruta si es necesario
import { AuthService } from '../../../core/auth/data-access/auth-service';
import { LocalidadService,Localidad } from '../../data-access/localidad-service'; // Ajusta ruta
import { ToastService } from '../../../shared/modal/toast/toast.service';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';


export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const pass = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    return pass && confirm && pass !== confirm ? { passwordMismatch: true } : null;
  };
}
@Component({
  selector: 'app-config-fletero',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-fletero.html',
})
export class ConfigFleteroComponent implements OnInit {
  private fb = inject(FormBuilder);
  private _authService = inject(AuthService);
  private localidadService = inject(LocalidadService);
  private toastService = inject(ToastService);
  private configService = inject(ConfigService);

  form: FormGroup;
  loading = true;
  submitting = false;

  passwordForm: FormGroup;
  submittingPassword = false;

  // Estado Localidades
  localidadesBuscadas: Localidad[] = [];
  localidadesSeleccionadas: Localidad[] = [];
  buscandoLocalidades = false;
  mostrarResultados = false;

  constructor() {
    this.form = this.fb.group({
      // Datos Personales
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      telefono: ['', Validators.required],
      fecha_nacimiento: ['', Validators.required],
      email: [{ value: '', disabled: true }],

      // Datos Fletero
      descripcion: [''],
      vehiculo: ['', Validators.required], // Tipo vehiculo
      modelo_vehiculo: [''],
      patente: ['', Validators.required],
      capacidad_kg: [null, [Validators.required, Validators.min(1)]],

      // Buscador Localidad (Auxiliar)
      buscarLocalidad: ['']

    });

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
     }, { validators: passwordMatchValidator() });

    // Listener para búsqueda de localidades
    this.form.get('buscarLocalidad')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(termino => {
      if (termino && termino.length >= 2) {
        this.buscarLocalidades(termino);
      } else {
        this.localidadesBuscadas = [];
        this.mostrarResultados = false;
      }
    });
  }

  async ngOnInit() {
    await this.cargarDatosCompletos();
  }

  // En config-fletero.ts

  async cargarDatosCompletos() {
   try {
    this.loading = true;
    const { data: { session } } = await this._authService.session();

    if (!session?.user) return;

    // 1. Pedimos Perfil (Usuario + Transportista) al ConfigService
    const datos = await this.configService.getPerfilFleteroCompleto(session.user.id);

    if (datos) {
      // Cargar formulario con datos básicos
      this.form.patchValue({
        nombre: datos.usuario.nombre,
        apellido: datos.usuario.apellido,
        telefono: datos.usuario.telefono,
        fecha_nacimiento: datos.usuario.fecha_nacimiento,
        email: datos.usuario.email,
      });

      if (datos.transportista) {
        this.form.patchValue({
          descripcion: datos.transportista.descripcion,
          vehiculo: datos.transportista.vehiculo,
          modelo_vehiculo: datos.transportista.modelo_vehiculo,
          patente: datos.transportista.patente,
          capacidad_kg: datos.transportista.capacidad_kg,
        });

        // 2. AQUI ESTÁ LA MAGIA:
        // Usamos el ID del transportista que acabamos de recibir
        // para pedir sus localidades al servicio especialista (LocalidadService)
        const t_id = datos.transportista.transportista_id;
        console.log('Cargando localidades para transportista:', t_id);

        const localidades = await this.localidadService.obtenerLocalidadesTransportista(t_id);
        this.localidadesSeleccionadas = localidades || [];
      }
    }

  } catch (error) {
    console.error(error);
    this.toastService.showDanger('Error', 'No se pudieron cargar los datos');
  } finally {
    this.loading = false;
  }
 }

  // --- Lógica de Localidades (Igual que en Sign Up) ---

  async buscarLocalidades(termino: string) {
    this.buscandoLocalidades = true;
    try {
      const resultados = await this.localidadService.buscarLocalidades(termino);
      // Filtrar las que ya tengo seleccionadas
      this.localidadesBuscadas = resultados.filter(
        loc => !this.localidadesSeleccionadas.some(sel => sel.localidad_id === loc.localidad_id)
      );
      this.mostrarResultados = true;
    } catch (err) {
      console.error(err);
    } finally {
      this.buscandoLocalidades = false;
    }
  }

  agregarLocalidad(loc: Localidad) {
    this.localidadesSeleccionadas.push(loc);
    this.localidadesBuscadas = [];
    this.mostrarResultados = false;
    this.form.get('buscarLocalidad')?.setValue('', { emitEvent: false });
  }

  quitarLocalidad(loc: Localidad) {
    this.localidadesSeleccionadas = this.localidadesSeleccionadas.filter(
      l => l.localidad_id !== loc.localidad_id
    );
  }

  // --- Submit ---

 async onSubmit() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }
  // ... validación de localidades ...

  try {
    this.submitting = true;
    const val = this.form.value;

    // Datos para tabla 'usuario' (estos coinciden bien)
    const datosUsuario = {
      nombre: val.nombre,
      apellido: val.apellido,
      telefono: val.telefono,
      fecha_nacimiento: val.fecha_nacimiento
    };

    // Datos para tabla 'transportista'
    const datosTransportista = {
      descripcion: val.descripcion,
      tipo_vehiculo: val.vehiculo,
      modelo_vehiculo: val.modelo_vehiculo,

      // ✅ CORRECCIÓN CRÍTICA AQUÍ:
      // El formulario tiene 'patente', pero la BD espera 'patente_vehiculo'
      patente_vehiculo: val.patente,

      // Aseguramos que sea número por si acaso
      capacidad_kg: Number(val.capacidad_kg)
    };

    // Llamada al servicio...
    await this.configService.actualizarPerfilFletero(
      datosUsuario,
      datosTransportista,
      this.localidadesSeleccionadas.map(l => l.localidad_id)
    );

    this.toastService.showSuccess('Guardado', 'Tu perfil de fletero ha sido actualizado');

  } catch (error: any) {
    // ... manejo de errores
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





