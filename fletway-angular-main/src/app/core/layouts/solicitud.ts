import { Cliente } from './cliente';
import { Localidad } from './localidad';
import { Presupuesto } from './presupuesto';

export interface Solicitud {
  solicitud_id: number;
  cliente_id?: number | null;
  presupuesto_aceptado?: number | null;
  localidad_origen_id?: number | null;
  localidad_destino_id?: number | null;
  direccion_origen?: string | null;
  direccion_destino?: string | null;
  fecha_creacion?: string | null;
  detalles_carga?: string | null;
  peso?: number | null;
  estado?: string | null;
  borrado_logico?: boolean;
  creado_en?: string | null;
  actualizado_en?: string | null;
  medidas?: string | null;
  hora_recogida?: string | null;
  presupuesto?: Presupuesto | null;


  // IMPORTANTE: Campo foto debe ser opcional y nullable
  foto?: string | null;

  // Relaciones
  cliente?: Cliente | null;
  localidad_origen?: Localidad | null;
  localidad_destino?: Localidad | null;

  // Campos calculados (agregados dinámicamente)
  _totalMostrables?: number;
  _hayAceptado?: boolean;
}
