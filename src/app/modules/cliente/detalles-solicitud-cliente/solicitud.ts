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

@Component({
  selector: 'app-solicitud-solicitudForm',
  templateUrl: './solicitud.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, Map],
})
export class SolicitudFormComponent implements OnInit, OnDestroy {
  solicitudForm: FormGroup;
  files: FileList | null = null;
  
  // Separar localidades: todas vs filtradas
  todasLasLocalidades: Localidad[] = [];
  localidadesFiltradas: Localidad[] = [];
  
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
  private router = inject(Router);
  private mapService = inject(MapService);

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
      this.localidadesFiltradas = [...this.todasLasLocalidades];
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
          // Actualizar solo las filtradas, no todas
          this.localidadesFiltradas = res ?? [];
          
          // IMPORTANTE: Si hay una localidad seleccionada, mantenerla en la lista
          const origenId = this.solicitudForm.get('localidad_origen_id')?.value;
          if (origenId) {
            const localidadSeleccionada = this.todasLasLocalidades.find(
              l => l.localidad_id === Number(origenId)
            );
            if (localidadSeleccionada && !this.localidadesFiltradas.find(l => l.localidad_id === localidadSeleccionada.localidad_id)) {
              this.localidadesFiltradas = [localidadSeleccionada, ...this.localidadesFiltradas];
            }
          }
        },
        error: (err) => {
          console.error('Error buscando localidades:', err);
          this.localidadesFiltradas = [...this.todasLasLocalidades];
        },
      });

    // === BÚSQUEDA DE DESTINO (opcional, si quieres filtrar por destino también) ===
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
          this.localidadesFiltradas = res ?? [];
          
          // Mantener localidad de destino seleccionada
          const destinoId = this.solicitudForm.get('localidad_destino_id')?.value;
          if (destinoId) {
            const localidadSeleccionada = this.todasLasLocalidades.find(
              l => l.localidad_id === Number(destinoId)
            );
            if (localidadSeleccionada && !this.localidadesFiltradas.find(l => l.localidad_id === localidadSeleccionada.localidad_id)) {
              this.localidadesFiltradas = [localidadSeleccionada, ...this.localidadesFiltradas];
            }
          }
        },
        error: (err) => {
          console.error('Error buscando localidades:', err);
          this.localidadesFiltradas = [...this.todasLasLocalidades];
        },
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

  async onSubmit() {
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
      this.todasLasLocalidades.find((l) => l.localidad_id === numId)?.nombre ||
      undefined
    );
  }

  getLocalidadProvincia(id: number | string): string | undefined {
    const numId = Number(id);
    return (
      this.todasLasLocalidades.find((l) => l.localidad_id === numId)?.provincia ||
      undefined
    );
  }

  refreshMap(): void {
    this.solicitudForm.updateValueAndValidity();
  }

  onMapOrigenChange(nuevaDireccion: string): void {
    if (nuevaDireccion) {
      this.solicitudForm.patchValue(
        { origen: nuevaDireccion },
        { emitEvent: false }
      );
    }
  }

  onMapDestinoChange(nuevaDireccion: string): void {
    if (nuevaDireccion) {
      this.solicitudForm.patchValue(
        { destino: nuevaDireccion },
        { emitEvent: false }
      );
    }
  }

  cancel() {
    history.back();
  }
}