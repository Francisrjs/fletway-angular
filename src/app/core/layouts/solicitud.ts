import { Cliente } from './cliente';
import { Localidad } from './localidad';

export interface Solicitud {
  solicitud_id: number;
  cliente_id?: number | null;
  presupuesto_aceptado?: string | null;
  localidad_origen_id?: number | null;
  direccion_origen?: string | null;
  direccion_destino?: string | null;
  fecha_creacion?: string | null;
  detalles_carga?: string | null;
  estado?: string | null; // <- ahora puede ser null
  borrado_logico?: boolean;
  creado_en?: string | null;
  actualizado_en?: string | null;
  medidas?: string | null;
  hora_recogida?: string | null;
  cliente?: Cliente | null; // <- puede faltar
  localidad_origen?: Localidad | null; // <- puede faltar
}
