import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { MapService } from './map-service';
import { ToastService } from '../../modal/toast/toast.service';
import { SkeletonLoaderComponent } from '../../ui/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent],
  templateUrl: './map.html',
  styleUrl: './map.scss',
  providers: [HttpClient],
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() localidadOrigen?: string = '';
  @Input() ciudadOrigen?: string = '';
  @Input() direccionOrigen?: string = '';
  @Input() localidadDestino?: string = '';
  @Input() ciudadDestino?: string = '';
  @Input() direccionDestino?: string = '';
  @Output() direccionOrigenChange = new EventEmitter<string>();
  @Output() direccionDestinoChange = new EventEmitter<string>();

  // Signal para el estado de carga
  loading = signal(true);

  private map: L.Map | undefined;
  private _mapService = inject(MapService);
  private _toastService = inject(ToastService);
  private routeLine: L.Polyline | undefined;
  private origenMarker: L.Marker | undefined;
  private destinoMarker: L.Marker | undefined;
  private destroy$ = new Subject<void>();
  private updateMap$ = new Subject<void>();

  // Distancia calculada
  distanciaKm = '0.00';
  private origenIcon = L.icon({
    iconUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="%2300BFFF" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  private destinoIcon = L.icon({
    iconUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="%23FF3B3F" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  private initMap(
    origenCoords?: [number, number],
    destinoCoords?: [number, number],
  ): void {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('El contenedor del mapa no fue encontrado!');
      return;
    }

    // Calcular punto medio entre origen y destino
    let centerCoords: L.LatLngExpression;
    let zoom = 13;

    if (origenCoords && destinoCoords) {
      // Punto medio entre origen y destino
      const centerLat = (origenCoords[0] + destinoCoords[0]) / 2;
      const centerLng = (origenCoords[1] + destinoCoords[1]) / 2;
      centerCoords = [centerLat, centerLng];
      console.log('📍 Centro del mapa calculado:', centerCoords);
    } else {
      // Fallback a Cozumel si no hay coordenadas
      centerCoords = [20.5083, -86.9458];
      console.warn('⚠️ Sin coordenadas, usando Cozumel como fallback');
    }

    // Inicializar el mapa con el centro correcto
    this.map = L.map('map').setView(centerCoords, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      console.log('🗺️ MapComponent - Inicializando mapa con datos:', {
        origen: this.direccionOrigen,
        destino: this.direccionDestino,
      });

      // Validar que tenemos los datos necesarios
      if (this.direccionOrigen && this.direccionDestino) {
        // PRIMERO: Obtener las coordenadas
        this.loadCoordinatesAndInitMap();
      } else {
        console.warn('⚠️ Faltan datos de origen o destino');
        this.loading.set(false);
      }
    }, 100);

    // Suscribirse al subject con debounce de 3 segundos
    this.updateMap$
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe(() => {
        this.showRouteOnMap();
      });
  }

  private loadCoordinatesAndInitMap(): void {
    console.log('📍 Obteniendo coordenadas...');

    // Construir direcciones
    const origenParts = [
      this.direccionOrigen,
      this.ciudadOrigen,
      this.localidadOrigen,
    ].filter(Boolean);
    const destinoParts = [
      this.direccionDestino,
      this.ciudadDestino,
      this.localidadDestino,
    ].filter(Boolean);

    const origenAddress = origenParts.join(', ');
    const destinoAddress = destinoParts.join(', ');

    console.log('🔍 Buscando coordenadas para:', {
      origen: origenAddress,
      destino: destinoAddress,
    });

    // Obtener coordenadas de origen
    this._mapService.getCoordinates(origenAddress).subscribe((origenCoords) => {
      if (!origenCoords) {
        console.error('❌ No se encontraron coordenadas para el origen');
        this._toastService.showDanger(
          'Dirección de origen incorrecta',
          '',
          3000,
        );
        this.loading.set(false);
        return;
      }

      console.log('✅ Coordenadas de origen obtenidas:', origenCoords);

      // Obtener coordenadas de destino
      this._mapService
        .getCoordinates(destinoAddress)
        .subscribe((destinoCoords) => {
          if (!destinoCoords) {
            console.error('❌ No se encontraron coordenadas para el destino');
            this._toastService.showDanger(
              'Dirección de destino incorrecta',
              '',
              3000,
            );
            this.loading.set(false);
            return;
          }

          console.log('✅ Coordenadas de destino obtenidas:', destinoCoords);
          console.log(
            '✅ Todas las coordenadas obtenidas, ahora inicializando mapa...',
          );

          // AHORA: Marcar como cargado para renderizar el mapa en el DOM
          this.loading.set(false);

          // Esperar a que el DOM esté listo
          setTimeout(() => {
            console.log('📍 Buscando contenedor del mapa...');
            const mapContainer = document.getElementById('map');
            if (mapContainer) {
              console.log(
                '✅ Contenedor encontrado, inicializando mapa con coordenadas',
              );
              // Pasar las coordenadas obtenidas a initMap
              this.initMap(
                origenCoords as [number, number],
                destinoCoords as [number, number],
              );
              this.showRouteOnMap();
              console.log('✅ Mapa cargado completamente');
            } else {
              console.error('❌ El contenedor del mapa aún no está disponible');
            }
          }, 100);
        });
    });
  }

  ngOnChanges(): void {
    // Dispara el subject para actualizar después de 3 segundos
    this.updateMap$.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Calcula la ruta usando OSRM
  private async calculateRoute(
    origenCoords: [number, number],
    destinoCoords: [number, number],
  ): Promise<void> {
    if (!this.map) return;

    // Llamar a OSRM para calcular la ruta
    await this._mapService
      .getRoute(origenCoords, destinoCoords)
      .subscribe((routeData) => {
        if (!routeData || !this.map) {
          console.error('No se pudo calcular la ruta.');
          return;
        }

        // Eliminar la línea anterior si existe
        if (this.routeLine) {
          this.map.removeLayer(this.routeLine);
        }

        // Dibujar la nueva ruta en naranja
        this.routeLine = L.polyline(routeData.coordinates, {
          color: 'orange',
          weight: 5,
          opacity: 0.7,
        }).addTo(this.map);

        // Actualizar la distancia
        this.distanciaKm = (routeData.distance / 1000).toFixed(2);

        // Ajustar el mapa para mostrar la ruta completa
        if (this.origenMarker && this.destinoMarker) {
          const group = L.featureGroup([
            this.origenMarker,
            this.destinoMarker,
            this.routeLine,
          ]);
          this.map.fitBounds(group.getBounds().pad(0.1));
        }
      });
  }

  // Dibuja el recorrido entre origen y destino
  showRouteOnMap(): void {
    // Limpiar COMPLETAMENTE marcadores y ruta anterior
    if (this.origenMarker) {
      if (this.map && this.map.hasLayer(this.origenMarker)) {
        this.map.removeLayer(this.origenMarker);
      }
      this.origenMarker = undefined;
    }
    if (this.destinoMarker) {
      if (this.map && this.map.hasLayer(this.destinoMarker)) {
        this.map.removeLayer(this.destinoMarker);
      }
      this.destinoMarker = undefined;
    }
    if (this.routeLine) {
      if (this.map && this.map.hasLayer(this.routeLine)) {
        this.map.removeLayer(this.routeLine);
      }
      this.routeLine = undefined;
    }

    // Validar que hay datos válidos para mostrar
    if (
      !this.direccionOrigen ||
      !this.direccionDestino ||
      !this.ciudadOrigen ||
      !this.ciudadDestino
    ) {
      console.warn(
        'Faltan datos para mostrar el mapa. Por favor, completa origen y destino.',
      );
      return;
    }

    // Construir direcciones de forma segura
    const origenParts = [
      this.direccionOrigen,
      this.ciudadOrigen,
      this.localidadOrigen,
    ].filter(Boolean);
    const destinoParts = [
      this.direccionDestino,
      this.ciudadDestino,
      this.localidadDestino,
    ].filter(Boolean);

    const origenAddress = origenParts.join(', ');
    const destinoAddress = destinoParts.join(', ');

    // Obtener coordenadas de origen
    this._mapService.getCoordinates(origenAddress).subscribe((origenCoords) => {
      if (!origenCoords || !this.map) {
        console.error('No se encontraron coordenadas para el origen.');
        this._toastService.showDanger('Dirección incorrecta', '', 3000);
        return;
      }

      // Crear marcador de origen (arrastrables)
      this.origenMarker = L.marker(origenCoords, {
        icon: this.origenIcon,
        draggable: true,
      })
        .addTo(this.map!)
        .bindPopup('Origen: ' + origenAddress);

      // Evento cuando se arrastra el marcador de origen
      this.origenMarker.on('dragend', () => {
        const newPos = this.origenMarker!.getLatLng();
        this.direccionOrigenchange(newPos.lat, newPos.lng);

        if (this.destinoMarker) {
          this.calculateRoute(
            [newPos.lat, newPos.lng],
            [
              this.destinoMarker.getLatLng().lat,
              this.destinoMarker.getLatLng().lng,
            ],
          );
        }
      });

      // Obtener coordenadas de destino
      this._mapService
        .getCoordinates(destinoAddress)
        .subscribe((destinoCoords) => {
          if (!destinoCoords || !this.map) {
            console.error('No se encontraron coordenadas para el destino.');
            this._toastService.showDanger('Dirección incorrecta', '', 3000);
            return;
          }

          // Crear marcador de destino (arrastrable)
          this.destinoMarker = L.marker(destinoCoords, {
            icon: this.destinoIcon,
            draggable: true,
          })
            .addTo(this.map!)
            .bindPopup('Destino: ' + destinoAddress);

          // Evento cuando se arrastra el marcador de destino
          this.destinoMarker.on('dragend', () => {
            const newPos = this.destinoMarker!.getLatLng();
            this.direccionDestinochange(newPos.lat, newPos.lng);

            if (this.origenMarker) {
              this.calculateRoute(
                [
                  this.origenMarker.getLatLng().lat,
                  this.origenMarker.getLatLng().lng,
                ],
                [newPos.lat, newPos.lng],
              );
            }
          });

          // Calcular la ruta inicial
          this.calculateRoute(origenCoords, destinoCoords);
        });
    });
  }
  direccionDestinochange(lat: number, lon: number) {
    this._mapService.getAddress(lat, lon).subscribe({
      next: (address) => {
        if (address) {
          console.log('Direccion destino cambiada a:', address);
          this.direccionDestinoChange.emit(address);

          // Mostrar toast de éxito
          this._toastService.showSuccess(
            'Dirección de destino actualizada',
            address,
            3000,
          );
        } else {
          // Mostrar toast de error
          this._toastService.showDanger(
            'Dirección incorrecta',
            'No se pudo calcular la dirección de destino.',
            4000,
          );
        }
      },
      error: (err) => {
        console.error('Error obteniendo dirección de destino:', err);
        this._toastService.showDanger(
          'Error',
          'Ocurrió un error al calcular la dirección de destino.',
          4000,
        );
      },
    });
  }

  direccionOrigenchange(lat: number, lon: number) {
    this._mapService.getAddress(lat, lon).subscribe({
      next: (address) => {
        if (address) {
          console.log('Direccion origen cambiada a:', address);
          this.direccionOrigenChange.emit(address);

          // Mostrar toast de éxito
          this._toastService.showSuccess(
            'Dirección de origen actualizada',
            address,
            3000,
          );
        } else {
          // Mostrar toast de error
          this._toastService.showDanger(
            'Dirección incorrecta',
            'No se pudo calcular la dirección de origen.',
            4000,
          );
        }
      },
      error: (err) => {
        console.error('Error obteniendo dirección de origen:', err);
        this._toastService.showDanger(
          'Error',
          'Ocurrió un error al calcular la dirección de origen.',
          4000,
        );
      },
    });
  }
}
