import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
  [key: string]: string; // si no te interesan todos los campos
}
@Injectable({
  providedIn: 'root',
})
export class MapService {
  // URL de la API de Nominatim
  private nominatimUrl = 'https://nominatim.openstreetmap.org/search';
  private http = inject(HttpClient);

  /**
   * Convierte una dirección a coordenadas (latitud, longitud).
   * @param address La dirección en formato de texto.
   * @returns Un Observable con un array [lat, lon] o null si no se encuentra.
   */
  getCoordinates(address: string): Observable<[number, number] | null> {
    const params = {
      q: address,
      format: 'json',
      limit: '1', // Solo queremos el resultado más relevante
    };

    return this.http
      .get<NominatimResponse[]>(this.nominatimUrl, { params })
      .pipe(
        map((results) => {
          if (results && results.length > 0) {
            // Extraemos la latitud y longitud de la respuesta
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);
            return [lat, lon] as [number, number];
          }
          return null; // Si no hay resultados, devolvemos null
        }),
      );
  }
}
