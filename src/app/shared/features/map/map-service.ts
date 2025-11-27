import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
  [key: string]: string;
}

interface OSRMResponse {
  code: string;
  routes: {
    distance: number;
    duration: number;
    geometry: {
      coordinates: number[][];
      type: string;
    };
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private nominatimUrl = 'https://nominatim.openstreetmap.org/search';
  private osrmUrl = 'https://router.project-osrm.org/route/v1/driving';
  private http = inject(HttpClient);

  /**
   * Convierte una dirección a coordenadas (latitud, longitud).
   */
  getCoordinates(address: string): Observable<[number, number] | null> {
    const params = {
      q: address,
      format: 'json',
      limit: '1',
    };

    return this.http
      .get<NominatimResponse[]>(this.nominatimUrl, { params })
      .pipe(
        map((results) => {
          if (results && results.length > 0) {
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);
            return [lat, lon] as [number, number];
          }
          return null;
        }),
      );
  }

  /**
   * Obtiene la ruta entre dos puntos usando OSRM.
   */
  getRoute(
    origen: [number, number],
    destino: [number, number],
  ): Observable<{ coordinates: [number, number][]; distance: number } | null> {
    // OSRM usa lon,lat (no lat,lon)
    const url = `${this.osrmUrl}/${origen[1]},${origen[0]};${destino[1]},${destino[0]}?overview=full&geometries=geojson`;

    return this.http.get<OSRMResponse>(url).pipe(
      map((response) => {
        if (response.code === 'Ok' && response.routes.length > 0) {
          const route = response.routes[0];
          // Convertir de [lon, lat] a [lat, lon] para Leaflet
          const coordinates = route.geometry.coordinates.map(
            (coord) => [coord[1], coord[0]] as [number, number],
          );
          return {
            coordinates,
            distance: route.distance, // en metros
          };
        }
        return null;
      }),
    );
  }
}
