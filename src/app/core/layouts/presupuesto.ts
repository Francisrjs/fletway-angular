import { Fletero } from "./fletero";

export interface Presupuesto {
  presupuesto_id: number;
  solicitud_id: number;
  transportista_id: number;
  precio_estimado?: number;
  comentario?: string|null;
  fecha_creacion?:string|null;
  estado?: string|null;
  borrado_logico?:boolean;
  creado_en?:string |null;
  actualizado_en?:string|null;
  transportista?:Fletero | null;
}
