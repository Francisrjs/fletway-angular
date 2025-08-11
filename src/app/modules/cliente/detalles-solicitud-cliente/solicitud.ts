import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SolcitudService } from '../../data-access/solicitud-service';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil,
  of,
} from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-solicitud-form',
  templateUrl: './solicitud.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
})
export class SolicitudFormComponent implements OnInit, OnDestroy {
  form: FormGroup;
  files: FileList | null = null;
  submitting = false;
  message: { type: 'success' | 'error' | null; text?: string } = { type: null };

  // para búsqueda de localidades
  private originSearch$ = new Subject<string>();
  localidades: Array<any> = [];
  originTyped = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private solicitudService: SolcitudService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      origin: ['', [Validators.required]],
      localidadOrigenId: [null, [Validators.required]],
      destination: ['', [Validators.required]],
      pickupDate: [''],
      pickupTime: [''],
      detalle: ['', [Validators.required]],
      dimensions: [''],
      weight: [null],
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
        next: (res: any[]) => {
          this.localidades = res ?? [];
        },
        error: (err) => {
          console.error('Error buscando localidades:', err);
          this.localidades = [];
        },
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
    this.form.get('localidadOrigenId')?.setValue(null);
    this.originSearch$.next(value);
  }

  selectLocalidad(loc: any) {
    // pone el nombre en el input y setea el id
    this.form.get('origin')?.setValue(`${loc.nombre}, ${loc.provincia}`);
    this.form
      .get('localidadOrigenId')
      ?.setValue(loc.localidad_id ?? loc.localidadId ?? loc.id);
    this.localidades = [];
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message = { type: 'error', text: 'Revisá los campos obligatorios.' };
      return;
    }

    this.submitting = true;
    this.message = { type: null };

    const v = this.form.value;

    const payload = {
      direccion_origen: v.origin,
      direccion_destino: v.destination,
      fecha_recogida: v.pickupDate || undefined,
      hora_recogida_time: v.pickupTime || undefined,
      detalles_carga: v.detalle,
      medidas: v.dimensions || null,
      peso: v.weight != null ? Number(v.weight) : null,
      localidad_origen_id: v.localidadOrigenId ?? null,
    } as const;

    try {
      const { data, error } = await this.solicitudService.createSolicitud(
        payload,
        this.files,
      );

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
        text: 'Solicitud creada correctamente.',
      };

      if (data?.solicitud_id) {
        this.router.navigate(['/mis-solicitudes']);
      } else {
        this.form.reset();
        this.files = null;
      }
    } catch (err) {
      console.error('submit catch:', err);
      this.message = { type: 'error', text: 'Error inesperado.' };
    } finally {
      this.submitting = false;
    }
  }

  cancel() {
    history.back();
  }
}
