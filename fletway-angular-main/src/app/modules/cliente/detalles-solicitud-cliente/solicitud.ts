import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
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
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { Localidad } from '../../../core/layouts/localidad';
import { MapComponent } from '../../../shared/features/map/map';
import { SolcitudService } from '../../data-access/solicitud-service';
import { MapService } from '../../../shared/features/map/map-service';
import { ToastService } from '../../../shared/modal/toast/toast.service';
import { SolicitudFlaskService } from '../../data-access/solicitud-flask.service'; // Importar el nuevo servicio
import { Solicitud } from '../../../core/layouts/solicitud';

@Component({
  selector: 'app-solicitud-solicitudForm',
  templateUrl: './solicitud.html',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MapComponent,
    FontAwesomeModule,
  ],
})
export class SolicitudFormComponent implements OnInit, OnDestroy {
  @Input() newSolicitud?: boolean = false;
  @Input() editMode?: boolean = false;
  @Output() solicitudCreada = new EventEmitter<Solicitud>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() solicitudEditada = new EventEmitter<Solicitud>();
  solicitudForm: FormGroup;
  files: FileList | null = null;

  // Variables para fotos múltiples
  fotosSeleccionadas: File[] = [];
  previsualizacionFotos: string[] = [];
  subiendoFotos = false;
  fotoSeleccionadaIndex: number | null = null;
  mostrarPopupFoto = false;
  readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  readonly ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
  readonly MAX_FOTOS = 10;

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

  // Validación de direcciones
  direccionOrigenValida = false;
  direccionDestinoValida = false;
  validandoDireccionOrigen = false;
  validandoDireccionDestino = false;

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
      horaRecogidaDesde: [null],
      horaRecogidaHasta: [null],
      detalle_carga: ['', Validators.required],
      detalle: ['', [Validators.required]],
      peso: [null, Validators.required],
      tolerancia_min: [null, Validators.required],
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
        // Invalidar validación cuando cambia la dirección
        this.direccionOrigenValida = false;
        // Revalidar dirección automáticamente
        if (value && value.trim().length > 5) {
          this.validarDireccionOrigen(value);
        }
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
        // Invalidar validación cuando cambia la dirección
        this.direccionDestinoValida = false;
        // Revalidar dirección automáticamente
        if (value && value.trim().length > 5) {
          this.validarDireccionDestino(value);
        }
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
   * Maneja la selección de múltiples fotos
   */
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    const fotosValidas: File[] = [];
    const errores: string[] = [];

    // Validar cada archivo
    for (const file of files) {
      // Verificar límite de cantidad
      if (
        this.fotosSeleccionadas.length + fotosValidas.length >=
        this.MAX_FOTOS
      ) {
        errores.push(`Máximo ${this.MAX_FOTOS} fotos permitidas`);
        break;
      }

      // Validar tipo de archivo
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        errores.push(`${file.name}: Solo se permiten archivos PNG o JPG`);
        continue;
      }

      // Validar tamaño
      if (file.size > this.MAX_FILE_SIZE) {
        errores.push(
          `${file.name}: Tamaño máximo ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        );
        continue;
      }

      fotosValidas.push(file);
    }

    // Agregar fotos válidas
    fotosValidas.forEach((file) => {
      this.fotosSeleccionadas.push(file);

      // Crear previsualización
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previsualizacionFotos.push(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });

    // Mostrar errores si hay
    if (errores.length > 0) {
      this.toastService.showWarning(
        'Algunas fotos no se agregaron',
        errores.join(', '),
        4000,
      );
    } else if (fotosValidas.length > 0) {
      this.toastService.showSuccess(
        `${fotosValidas.length} foto${fotosValidas.length > 1 ? 's' : ''} agregada${fotosValidas.length > 1 ? 's' : ''}`,
        '',
        2000,
      );
    }

    // Limpiar input
    input.value = '';
  }

  /**
   * Elimina una foto de la lista
   */
  onRemoveFoto(index: number): void {
    this.fotosSeleccionadas.splice(index, 1);
    this.previsualizacionFotos.splice(index, 1);
    this.toastService.showSuccess('Foto eliminada', '', 2000);
  }

  /**
   * Abre el popup para previsualizar una foto
   */
  abrirPopupFoto(index: number): void {
    this.fotoSeleccionadaIndex = index;
    this.mostrarPopupFoto = true;
  }

  /**
   * Cierra el popup de previsualización
   */
  cerrarPopupFoto(): void {
    this.mostrarPopupFoto = false;
    this.fotoSeleccionadaIndex = null;
  }

  /**
   * Sube múltiples fotos a Supabase Storage y las guarda en la tabla fotos
   */
  private async uploadFotos(solicitudId: number): Promise<void> {
    if (this.fotosSeleccionadas.length === 0) return;

    this.subiendoFotos = true;
    const supabase = this.solicitudService['_supabaseClient'];

    try {
      for (let i = 0; i < this.fotosSeleccionadas.length; i++) {
        const file = this.fotosSeleccionadas[i];
        const fileName = `${solicitudId}/${Date.now()}-${i}-${file.name}`;

        // 1. Subir archivo a Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('fotos_solicitud')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error(`Error subiendo foto ${file.name}:`, uploadError);
          this.toastService.showWarning(
            `Error subiendo ${file.name}`,
            uploadError.message,
            3000,
          );
          continue;
        }

        // 2. Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('fotos_solicitud')
          .getPublicUrl(fileName);

        // 3. Guardar en tabla fotos
        const { error: dbError } = await supabase.from('fotos').insert({
          solc_id: solicitudId,
          url: urlData.publicUrl,
          archivo_nombre: file.name,
          archivo_tamaño: file.size,
          mime_type: file.type,
          orden: i,
          descripcion: null,
        });

        if (dbError) {
          console.error(`Error guardando foto ${file.name} en BD:`, dbError);
          this.toastService.showWarning(
            `Error guardando ${file.name}`,
            dbError.message,
            3000,
          );
        }
      }

      this.toastService.showSuccess(
        `${this.fotosSeleccionadas.length} foto(s) subida(s) correctamente`,
        '',
        3000,
      );
    } catch (error) {
      console.error('Error en uploadFotos:', error);
      this.toastService.showWarning(
        'Error subiendo fotos',
        'Revisa la consola',
        3000,
      );
    } finally {
      this.subiendoFotos = false;
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
    this.toastService.showWarning('Guardando solicitud...');

    // Validar fecha de recogida no sea anterior a hoy
    const fechaRecogida = this.solicitudForm.value.fechaRecogida;
    if (fechaRecogida) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fechaSeleccionada = new Date(fechaRecogida);
      fechaSeleccionada.setHours(0, 0, 0, 0);

      if (fechaSeleccionada < hoy) {
        this.toastService.showWarning(
          'Fecha inválida',
          'La fecha de recogida no puede ser anterior a hoy',
          4000,
        );
        return;
      }
    }

    // Validar direcciones
    const origenValido = await this.validarDireccion(
      this.solicitudForm.value.origen,
      'origen',
    );
    const destinoValido = await this.validarDireccion(
      this.solicitudForm.value.destino,
      'destino',
    );

    if (!origenValido) {
      this.toastService.showWarning(
        'Dirección de origen inválida',
        'No se encontraron coordenadas para la dirección de origen. Verifique la dirección.',
        4000,
      );
      return;
    }

    if (!destinoValido) {
      this.toastService.showWarning(
        'Dirección de destino inválida',
        'No se encontraron coordenadas para la dirección de destino. Verifique la dirección.',
        4000,
      );
      return;
    }

    this.submitting = true;
    this.message = { type: null };

    const v = this.solicitudForm.value;

    const payload = {
      direccion_origen: v.origen,
      direccion_destino: v.destino,
      localidad_origen_id: Number(v.localidad_origen_id),
      localidad_destino_id: Number(v.localidad_destino_id),
      fecha_recogida: v.fechaRecogida || undefined,
      hora_recogida_time: v.horaRecogida || undefined,
      detalles_carga: v.detalle_carga || undefined,
      medidas: v.detalle || undefined,
      peso: v.peso !== null ? Number(v.peso) : null,
    };

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

      // 2. Si hay fotos seleccionadas, subirlas a Supabase Storage
      if (this.fotosSeleccionadas.length > 0) {
        console.log(`Subiendo ${this.fotosSeleccionadas.length} foto(s)...`);
        await this.uploadFotos(data.solicitud_id);
      }

      this.toastService.showSuccess(
        'Pedido creado correctamente',
        'Tu solicitud ha sido creada exitosamente',
        3000,
      );

      this.message = {
        type: 'success',
        text: 'Pedido creado correctamente.',
      };

      // Navegar después de 1 segundo para que el usuario vea el mensaje
      this.solicitudCreada.emit(data);
    } catch (err: unknown) {
      console.error('Error en submit:', err);
      let errorMessage = 'Error inesperado.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      this.toastService.showDanger('Error al crear pedido', errorMessage, 4000);
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
      // Validar la nueva dirección
      this.validarDireccionOrigen(nuevaDireccion);
    }
  }

  onMapDestinoChange(nuevaDireccion: string): void {
    if (nuevaDireccion) {
      this.solicitudForm.patchValue(
        { destino: nuevaDireccion },
        { emitEvent: false },
      );
      // Validar la nueva dirección
      this.validarDireccionDestino(nuevaDireccion);
    }
  }

  /**
   * Valida dirección de origen (método público para uso reactivo)
   */
  validarDireccionOrigen(direccion: string): void {
    this.validarDireccion(direccion, 'origen');
  }

  /**
   * Valida dirección de destino (método público para uso reactivo)
   */
  validarDireccionDestino(direccion: string): void {
    this.validarDireccion(direccion, 'destino');
  }

  /**
   * Valida que una dirección tenga coordenadas válidas
   * Se ejecuta cada vez que cambia la dirección
   */
  private async validarDireccion(
    direccion: string,
    tipo: 'origen' | 'destino',
  ): Promise<boolean> {
    if (!direccion || direccion.trim().length === 0) {
      if (tipo === 'origen') {
        this.direccionOrigenValida = false;
      } else {
        this.direccionDestinoValida = false;
      }
      return false;
    }

    // Marcar que estamos validando
    if (tipo === 'origen') {
      this.validandoDireccionOrigen = true;
    } else {
      this.validandoDireccionDestino = true;
    }

    try {
      const coordenadas = await new Promise<[number, number] | null>(
        (resolve) => {
          this.mapService.getCoordinates(direccion).subscribe({
            next: (coords) => resolve(coords),
            error: () => resolve(null),
          });
        },
      );

      const esValida =
        coordenadas !== null &&
        !isNaN(coordenadas[0]) &&
        !isNaN(coordenadas[1]);

      if (tipo === 'origen') {
        this.direccionOrigenValida = esValida;
      } else {
        this.direccionDestinoValida = esValida;
      }

      console.log(
        `📍 Validación ${tipo}:`,
        direccion,
        '→',
        esValida ? '✓' : '✗',
        coordenadas,
      );
      return esValida;
    } catch (error) {
      console.error(`Error validando dirección ${tipo}:`, error);
      if (tipo === 'origen') {
        this.direccionOrigenValida = false;
      } else {
        this.direccionDestinoValida = false;
      }
      return false;
    } finally {
      if (tipo === 'origen') {
        this.validandoDireccionOrigen = false;
      } else {
        this.validandoDireccionDestino = false;
      }
    }
  }

  /**
   * Obtiene la fecha mínima permitida (hoy)
   */
  get fechaMinima(): string {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }

  cancel() {
    if (this.newSolicitud) {
      this.onCancel.emit();
    } else {
      history.back();
    }
  }
}
