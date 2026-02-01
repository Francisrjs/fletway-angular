export interface Cliente {
  u_id?: string | null;
  email?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  telefono?: string | null;
  creado_en?: string | null;
  usuario_id?: number | null;
  actualizado_en?: string | null;
  borrado_logico?: boolean;
  fecha_registro?: string | null;
  contrasena_hash?: string | null;
  fecha_nacimiento?: string | null;
  foto?: string | null;
}
