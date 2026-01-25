export interface Mensaje {
  id: number;
  created_at: string;
  solic_id: number;
  mensaje: string;
  user_id: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  is_read?: boolean;
}

export interface MensajeConUsuario extends Mensaje {
  usuario?: {
    nombre: string;
    apellido: string;
    email?: string;
  };
  esMio: boolean; // Para saber si el mensaje es del usuario actual
}

export type MensajeCreate = Omit<
  Mensaje,
  'id' | 'created_at' | 'edited_at' | 'deleted_at'
>;
export type MensajeUpdate = Partial<Pick<Mensaje, 'mensaje' | 'edited_at'>>;
