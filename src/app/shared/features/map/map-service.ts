import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, catchError, of, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    pedestrian?: string;
    cycleway?: string;
    footway?: string;
    residential?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  importance?: number;
  [key: string]: any;
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
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org/search';
  private readonly osrmUrl = 'https://router.project-osrm.org/route/v1/driving';
  private readonly http = inject(HttpClient);

  /**
   * Convierte una dirección a coordenadas (latitud, longitud).
   */
  getCoordinates(address: string): Observable<[number, number] | null> {
    if (!address || address.trim().length === 0) {
      return of(null);
    }

    const params = {
      q: address.trim(),
      format: 'json',
      limit: '1',
      addressdetails: '1',
    };

    return this.http
      .get<NominatimResponse[]>(this.nominatimUrl, { params })
      .pipe(
        map((results) => {
          if (results && results.length > 0) {
            const lat = parseFloat(results[0].lat);
            const lon = parseFloat(results[0].lon);
            if (!isNaN(lat) && !isNaN(lon)) {
              return [lat, lon] as [number, number];
            }
          }
          return null;
        }),
        catchError(() => of(null))
      );
  }

  /**
   * Valida si una dirección puede ser resuelta por Nominatim.
   * - `strict = false`: devuelve `true` si Nominatim encuentra al menos un resultado.
   * - `strict = true`: solicita `addressdetails` y requiere componentes básicos.
   */
  validateAddress(address: string, strict = false): Observable<boolean> {
    if (!address || address.trim().length < 3) {
      return of(false);
    }

    const params: any = {
      q: address.trim(),
      format: 'json',
      limit: '1',
      addressdetails: '1',
    };

    return this.http.get<NominatimResponse[]>(this.nominatimUrl, { params }).pipe(
      map((results) => {
        if (!results || results.length === 0) return false;
        if (!strict) return true;

        const addr = results[0].address;
        if (!addr) return false;

        const hasStreet = !!(
          addr['road'] || 
          addr['pedestrian'] || 
          addr['cycleway'] || 
          addr['footway'] || 
          addr['residential']
        );
        const hasNumber = !!addr['house_number'];
        const hasCity = !!(
          addr['city'] || 
          addr['town'] || 
          addr['village'] || 
          addr['county'] || 
          addr['state']
        );

        // Requisitos estrictos: (calle + ciudad) o (calle + número)
        return (hasStreet && hasCity) || (hasStreet && hasNumber);
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Validador asíncrono para FormControl de Angular.
   * Uso: this.formBuilder.control('', [], [this.mapService.addressValidator()])
   */
  addressValidator(strict = false): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value || control.value.trim().length === 0) {
        return of(null);
      }

      return of(control.value).pipe(
        debounceTime(500), // Espera 500ms después de que el usuario deje de escribir
        distinctUntilChanged(), // Solo valida si el valor cambió
        switchMap((address: string) => 
          this.validateAddress(address, strict).pipe(
            map(isValid => isValid ? null : { invalidAddress: true }),
            catchError(() => of({ invalidAddress: true }))
          )
        )
      );
    };
  }

  /**
   * Obtiene la dirección a partir de latitud y longitud (reverse geocoding).
   */
  getAddress(lat: number, lon: number): Observable<string | null> {
    if (isNaN(lat) || isNaN(lon)) {
      return of(null);
    }

    const params = {
      lat: lat.toString(),
      lon: lon.toString(),
      format: 'json',
      addressdetails: '1',
    };

    const reverseUrl = 'https://nominatim.openstreetmap.org/reverse';

    return this.http
      .get<NominatimResponse>(reverseUrl, { params })
      .pipe(
        map((result) => {
          if (!result) return null;
          return this.formatAddress(result);
        }),
        catchError(() => of(null))
      );
  }

  /**
   * Formatea la dirección a partir de componentes de Nominatim.
   * Retorna formato: "Calle Número" (sin ciudad, ya que eso viene del select de localidad)
   */
  private formatAddress(result: NominatimResponse): string | null {
    if (!result.address) {
      return result.display_name || null;
    }

    const addr = result.address;

    // Obtener la calle (road, residential, pedestrian, etc.)
    const street =
      addr['road'] ||
      addr['residential'] ||
      addr['pedestrian'] ||
      addr['cycleway'] ||
      addr['footway'];

    // Obtener el número de casa
    const number = addr['house_number'];

    // Construir formato: "Calle Número" (SIN ciudad)
    if (street && number) {
      return `${street} ${number}`;
    } else if (street) {
      return street;
    }

    // Si no hay calle, devolver solo display_name como fallback
    return result.display_name || null;
  }

  /**
   * Obtiene la ruta entre dos puntos usando OSRM.
   */
  getRoute(
    origen: [number, number],
    destino: [number, number],
  ): Observable<{ coordinates: [number, number][]; distance: number; duration: number } | null> {
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
            duration: route.duration, // en segundos
          };
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }
}