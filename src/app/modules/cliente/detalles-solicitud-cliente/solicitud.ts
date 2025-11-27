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

@Component({
  selector: 'app-solicitud-solicitudForm',
  templateUrl: './solicitud.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, Map],
})
export class SolicitudFormComponent implements OnInit, OnDestroy {
  solicitudForm: FormGroup; //TENER EN TODO
  files: FileList | null = null;
  localidades: Localidad[] = [];
  submitting = false;
  message: { type: 'success' | 'error' | null; text?: string } = { type: null };

  // para búsqueda de localidades
  private originSearch$ = new Subject<string>();

  originTyped = false;
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private solicitudService = inject(SolcitudService);
  private router = inject(Router);
  constructor() {
    this.solicitudForm = this.fb.group({
      origen: ['', [Validators.required]],
      localidad_origen_id: ['', [Validators.required]],
      destino: ['', [Validators.required]],
      localidad_destino_id: ['', [Validators.required]],
      fechaRecogida: [null],
      horaRecogida: [null],
      detalle_carga: ['', Validators.required],
      detalle: ['', [Validators.required]], // será usado como medidas
      peso: [null, Validators.required],
      // Si necesitas un título, descomenta la siguiente línea y agrégalo al form
      // titulo: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // escucha el subject para buscar localidades con debounce
    this.originSearch$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((term) => {
          this.originTyped = term.trim().length > 0;
          if (!term || term.trim().length < 2) {
            // limpiar resultados si term muy corto
            return of([]);
          }
          return this.solicitudService.searchLocalidades(term);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res: Localidad[]) => {
          this.localidades = res ?? [];
        },
        error: (err) => {
          console.error('Error buscando localidades:', err);
          this.localidades = [];
        },
      });
    this.solicitudService.getAllLocalidades().then((res) => {
      this.localidades = res ?? [];
      console.log(res);
    });

    // Escuchar cambios en los campos del formulario para actualizar el mapa
    this.solicitudForm
      .get('origen')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        // Trigger mapa update cuando cambia origen
        this.refreshMap();
      });

    this.solicitudForm
      .get('destino')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        // Trigger mapa update cuando cambia destino
        this.refreshMap();
      });

    this.solicitudForm
      .get('localidad_origen_id')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.refreshMap();
      });

    this.solicitudForm
      .get('localidad_destino_id')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.refreshMap();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilesChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.files = target.files;
    console.log(
      'Files selected (kept locally, not uploaded):',
      this.files?.length ?? 0,
    );
  }

  onOriginInput(value: string) {
    // limpiar el id si el usuario edita la dirección (evitar enviar id desincronizado)
    this.solicitudForm.get('localidad_origen_id')?.setValue(null);
    this.originSearch$.next(value);
  }

  async onSubmit() {
    //Chequea si la solicitud es valida
    if (this.solicitudForm.invalid) {
      this.solicitudForm.markAllAsTouched();
      console.log('Formulario invalido');
      console.log(this.solicitudForm);
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
      // Si usas título, agrega: titulo: v.titulo
    } as const;

    try {
      console.log(this.solicitudForm.value);
      const { data, error } =
        await this.solicitudService.createSolicitud(payload);

      if (error) {
        console.error('Error creando solicitud:', error);
        this.message = {
          type: 'error',
          text: 'Error creando la solicitud. Revisá la consola.',
        };
        this.submitting = false;
        return;
      }

      this.message = {
        type: 'success',
        text: 'Pedido creado correctamente.',
      };

      if (data?.solicitud_id) {
        this.router.navigate(['/mis-solicitudes']);
      } else {
        this.solicitudForm.reset();
        this.files = null;
      }
    } catch (err) {
      console.error('submit catch:', err);
      this.message = { type: 'error', text: 'Error inesperado.' };
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
      this.localidades.find((l) => l.localidad_id === numId)?.nombre ||
      undefined
    );
  }

  getLocalidadProvincia(id: number | string): string | undefined {
    const numId = Number(id);
    return (
      this.localidades.find((l) => l.localidad_id === numId)?.provincia ||
      undefined
    );
  }

  refreshMap(): void {
    // Fuerza la actualización del mapa cuando cambian los valores
    // Angular detectará cambios en los @Input del componente app-map
    this.solicitudForm.updateValueAndValidity();
  }

  cancel() {
    history.back();
  }
}
