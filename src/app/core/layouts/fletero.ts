import { Cliente } from "./cliente";

export interface Fletero{
    transportista_id: number;
    descripcion?: string;
    tipo_vehiculo?: string;
    capacidad_kg?: number;
    calificacion_promedio?: number;
    usuario_id?:number;
    patente_vehiculo?:string;
    modelo_vehiculo?:string;
    usuario:Cliente;

}