import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  debounceTime,
  distinctUntilChanged,
  of,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';

import { Localidad } from '../../../core/layouts/localidad';
import { Map } from '../../../shared/features/map/map';
import { SolcitudService } from '../../data-access/solicitud-service';
import { MapService } from '../../../shared/features/map/map-service';
import { ToastService } from '../../../shared/modal/toast/toast.service';
import { SolicitudFlaskService } from '../../data-access/solicitud-flask.service'; // Importar el nuevo servicio

@Component({
  selector: 'app-solicitud-solicitudForm',
  templateUrl: './solicitud.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, Map],
})
export class SolicitudFormComponent implements OnInit, OnDestroy {
  solicitudForm: FormGroup;
  files: FileList | null = null;

  // Variables para la foto
  fotoSeleccionada: File | null = null;
  previsualizacionFoto: string | null = null;
  subiendoFoto = false;

  // Separar localidades: todas vs filtradas
  todasLasLocalidades: Localidad[] = [];
  localidadesOrigenFiltradas: Localidad[] = [];
  localidadesDestinoFiltradas: Localidad[] = [];

  submitting = false;
  message: { type: 'success' | 'error' | null; text?: string } = { type: null };

  // para búsqueda de localidades
  private originSearch$ = new Subject<string>();
  private destinoSearch$ = new Subject<string>();

  originTyped = false;
  destinoTyped = false;

  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private solicitudService = inject(SolcitudService);
  private solicitudFlaskService = inject(SolicitudFlaskService); // Inyectar servicio Flask
  private router = inject(Router);
  private mapService = inject(MapService);
  private toastService = inject(ToastService);

  constructor() {
    this.solicitudForm = this.fb.group({
      origen: ['', [Validators.required]],
      localidad_origen_id: ['', Validators.required],
      destino: ['', [Validators.required]],
      localidad_destino_id: ['', Validators.required],
      fechaRecogida: [null],
      horaRecogida: [null],
      detalle_carga: ['', Validators.required],
      detalle: ['', [Validators.required]],
      peso: [null, Validators.required],
    });
  }

  get origen() {
    return this.solicitudForm.get('origen');
  }

  get destino() {
    return this.solicitudForm.get('destino');
  }

  ngOnInit(): void {
    // Cargar TODAS las localidades al inicio
    this.solicitudService.getAllLocalidades().then((res) => {
      this.todasLasLocalidades = res ?? [];
      this.localidadesOrigenFiltradas = [...this.todasLasLocalidades];
      this.localidadesDestinoFiltradas = [...this.todasLasLocalidades];
      console.log('Localidades cargadas:', res);
    });

    // === BÚSQUEDA DE ORIGEN ===
    this.solicitudForm
      .get('origen')
      ?.valueChanges.pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((value) => {
        this.originSearch$.next(value || '');
      });

    this.originSearch$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((term) => {
          this.originTyped = term.trim().length > 0;
          if (!term || term.trim().length < 2) {
            return of(this.todasLasLocalidades);
          }
          return this.solicitudService.searchLocalidades(term);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res: Localidad[]) => {
          this.localidadesOrigenFiltradas = res ?? [];
          const origenId = this.solicitudForm.get('localidad_origen_id')?.value;
          if (origenId) {
            const localidadSeleccionada = this.todasLasLocalidades.find(
              (l) => l.localidad_id === Number(origenId),
            );
            if (
              localidadSeleccionada &&
              !this.localidadesOrigenFiltradas.find(
                (l) => l.localidad_id === localidadSeleccionada.localidad_id,
              )
            ) {
              this.localidadesOrigenFiltradas = [
                localidadSeleccionada,
                ...this.localidadesOrigenFiltradas,
              ];
            }
          }
        },
        error: (err) => {
          console.error('Error buscando localidades:', err);
          this.localidadesOrigenFiltradas = [...this.todasLasLocalidades];
        },
      });

    // === BÚSQUEDA DE DESTINO ===
    this.solicitudForm
      .get('destino')
      ?.valueChanges.pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((value) => {
        this.destinoSearch$.next(value || '');
      });

    this.destinoSearch$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((term) => {
          this.destinoTyped = term.trim().length > 0;
          if (!term || term.trim().length < 2) {
            return of(this.todasLasLocalidades);
          }
          return this.solicitudService.searchLocalidades(term);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res: Localidad[]) => {
          this.localidadesDestinoFiltradas = res ?? [];
          const destinoId = this.solicitudForm.get(
            'localidad_destino_id',
          )?.value;
          if (destinoId) {
            const localidadSeleccionada = this.todasLasLocalidades.find(
              (l) => l.localidad_id === Number(destinoId),
            );
            if (
              localidadSeleccionada &&
              !this.localidadesDestinoFiltradas.find(
                (l) => l.localidad_id === localidadSeleccionada.localidad_id,
              )
            ) {
              this.localidadesDestinoFiltradas = [
                localidadSeleccionada,
                ...this.localidadesDestinoFiltradas,
              ];
            }
          }
        },
        error: (err) => {
          console.error('Error buscando localidades:', err);
          this.localidadesDestinoFiltradas = [...this.todasLasLocalidades];
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Maneja la selección de la foto
   */
  onFotoSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validar con el servicio Flask
      const validacion = this.solicitudFlaskService.validarArchivo(file);
      if (!validacion.valido) {
        this.toastService.showDanger(
          'Archivo inválido',
          validacion.mensaje,
          3000,
        );
        input.value = ''; // Limpiar input
        return;
      }

      this.fotoSeleccionada = file;

      // Crear previsualización
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previsualizacionFoto = e.target?.result as string;
      };
      reader.readAsDataURL(file);

      this.toastService.showSuccess('Foto seleccionada', file.name, 2000);
    }
  }

  /**
   * Elimina la previsualización de la foto
   */
  eliminarFoto(): void {
    this.fotoSeleccionada = null;
    this.previsualizacionFoto = null;

    // Limpiar el input file
    const input = document.getElementById('fotoSolicitud') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }

  onFilesChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.files = target.files;
    console.log(
      'Files selected (kept locally, not uploaded):',
      this.files?.length ?? 0,
    );
  }

  async onSubmit() {
    if (this.solicitudForm.invalid) {
      this.solicitudForm.markAllAsTouched();
      console.log('Formulario invalido');
      this.toastService.showWarning(
        'Formulario Invalido, revise los campos',
        '',
        4000,
      );
      this.message = { type: 'error', text: 'Revisá los campos obligatorios.' };
      return;
    }

    this.submitting = true;
    this.message = { type: null };

    const v = this.solicitudForm.value;

    const payload = {
      direccion_origen: v.origen,
      direccion_destino: v.destino,
      fecha_recogida: v.fechaRecogida || undefined,
      localidad_origen_id: v.localidad_origen_id,
      localidad_destino_id: v.localidad_destino_id,
      hora_recogida_time: v.horaRecogida || undefined,
      detalles_carga: v.detalle_carga || null,
      medidas: v.detalle || null,
      peso: v.peso !== null ? Number(v.peso) : null,
    } as const;

    try {
      console.log('Creando solicitud...', this.solicitudForm.value);

      // 1. Crear la solicitud en Supabase primero
      const { data, error } =
        await this.solicitudService.createSolicitud(payload);

      if (error || !data?.solicitud_id) {
        console.error('Error creando solicitud:', error);
        this.message = {
          type: 'error',
          text: 'Error creando la solicitud. Revisá la consola.',
        };
        this.submitting = false;
        return;
      }

      console.log('Solicitud creada con ID:', data.solicitud_id);

      // 2. Si hay foto seleccionada, subirla a Flask
      if (this.fotoSeleccionada) {
        this.subiendoFoto = true;
        try {
          console.log('Subiendo foto...');
          const respuesta = await this.solicitudFlaskService
            .subirFoto(data.solicitud_id, this.fotoSeleccionada)
            .toPromise();

          console.log('Foto subida exitosamente:', respuesta);
          this.toastService.showSuccess('Foto subida correctamente', '', 2000);
        } catch (fotoError: unknown) {
          console.error('Error subiendo foto:', fotoError);
          let errorMsg = 'Hubo un error al subir la foto.';
          if (fotoError instanceof Error) {
            errorMsg += ' ' + fotoError.message;
          }
          this.toastService.showWarning('Solicitud creada', errorMsg, 4000);
        } finally {
          this.subiendoFoto = false;
        }
      }

      this.message = {
        type: 'success',
        text: 'Pedido creado correctamente.',
      };

      // Navegar después de 1 segundo para que el usuario vea el mensaje
      setTimeout(() => {
        this.router.navigate(['/cliente']);
      }, 1000);
    } catch (err: unknown) {
      console.error('Error en submit:', err);
      let errorMessage = 'Error inesperado.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      this.message = {
        type: 'error',
        text: errorMessage,
      };
    } finally {
      this.submitting = false;
    }
  }

  get puedeMostrarMapa(): boolean {
    const v = this.solicitudForm.value;
    return !!(
      v.origen &&
      v.localidad_origen_id &&
      v.destino &&
      v.localidad_destino_id
    );
  }

  getLocalidadNombre(id: number | string): string | undefined {
    const numId = Number(id);
    return (
      this.todasLasLocalidades.find((l) => l.localidad_id === numId)?.nombre ||
      undefined
    );
  }

  getLocalidadProvincia(id: number | string): string | undefined {
    const numId = Number(id);
    return (
      this.todasLasLocalidades.find((l) => l.localidad_id === numId)
        ?.provincia || undefined
    );
  }

  refreshMap(): void {
    this.solicitudForm.updateValueAndValidity();
  }

  onMapOrigenChange(nuevaDireccion: string): void {
    if (nuevaDireccion) {
      this.solicitudForm.patchValue(
        { origen: nuevaDireccion },
        { emitEvent: false },
      );
    }
  }

  onMapDestinoChange(nuevaDireccion: string): void {
    if (nuevaDireccion) {
      this.solicitudForm.patchValue(
        { destino: nuevaDireccion },
        { emitEvent: false },
      );
    }
  }

  cancel() {
    history.back();
  }
}
