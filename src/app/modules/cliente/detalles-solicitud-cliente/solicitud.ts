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
  selector: 'app-solicitud-solicitudForm',
  templateUrl: './solicitud.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
})
export class SolicitudFormComponent implements OnInit, OnDestroy {
  solicitudForm: FormGroup;//TENER EN TODO
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
    this.solicitudForm = this.fb.group({
      //crear los validadores !!!!
      origen: ['', [Validators.required]],
      localidad_origen_id:['',[Validators.required]],
      destino: ['', [Validators.required]],
      fechaRecogida: [null],
      horaRecogida: [null],
      detalle: ['', [Validators.required]],
      dimensions: [''],
      peso: [null, Validators.required],
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
    this.solicitudForm.get('localidadOrigenId')?.setValue(null);
    this.originSearch$.next(value);
  }

  selectLocalidad(loc: any) {
    // pone el nombre en el input y setea el id
    this.solicitudForm.get('origin')?.setValue(`${loc.nombre}, ${loc.provincia}`);
    this.solicitudForm
      .get('localidadOrigenId')
      ?.setValue(loc.localidad_id ?? loc.localidadId ?? loc.id);
    this.localidades = [];
  }

  async onSubmit() {
    //Chequea si la solicitud es valida
    if (this.solicitudForm.invalid) {
      this.solicitudForm.markAllAsTouched();
      console.log("Formulario invalido");
      console.log(this.solicitudForm)
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
      hora_recogida_time: v.horaRecogida || undefined,
      detalles_carga: v.titulo,//crear input detitulo
      medidas: v.detalle || null,
      peso: v.peso != null ? Number(v.weight) : null,
      
    } as const;

    try {
      console.log(this.solicitudForm.value)
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

  cancel() {
    history.back();
  }
}
