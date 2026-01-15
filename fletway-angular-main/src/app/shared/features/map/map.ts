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
} from '@angular/core';
import * as L from 'leaflet';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { MapService } from './map-service';
import { ToastService } from '../../modal/toast/toast.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [],
  templateUrl: './map.html',
  styleUrl: './map.scss',
  providers: [HttpClient],
})
export class Map implements AfterViewInit, OnChanges, OnDestroy {
  @Input() localidadOrigen?: string = '';
  @Input() ciudadOrigen?: string = '';
  @Input() direccionOrigen?: string = '';
  @Input() localidadDestino?: string = '';
  @Input() ciudadDestino?: string = '';
  @Input() direccionDestino?: string = '';
  @Output() direccionOrigenChange = new EventEmitter<string>();
  @Output() direccionDestinoChange = new EventEmitter<string>();
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

  private initMap(): void {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('El contenedor del mapa no fue encontrado!');
      return;
    }

    // Coordenadas de Cozumel, Quintana Roo
    const cozumelCoords: L.LatLngExpression = [20.5083, -86.9458];

    // Centramos el mapa en Cozumel
    this.map = L.map('map').setView(cozumelCoords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
      this.showRouteOnMap();
    });

    // Suscribirse al subject con debounce de 3 segundos
    this.updateMap$
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe(() => {
        this.showRouteOnMap();
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
  private calculateRoute(
    origenCoords: [number, number],
    destinoCoords: [number, number],
  ): void {
    if (!this.map) return;

    // Llamar a OSRM para calcular la ruta
    this._mapService
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
          this._toastService.showDanger(
            'Dirección incorrecta',
            '',
            3000
          );
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
                    this._toastService.showDanger(
            'Dirección incorrecta',
          '',
            3000
          );
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
            3000
          );
        } else {
          // Mostrar toast de error
          this._toastService.showDanger(
            'Dirección incorrecta',
            'No se pudo calcular la dirección de destino.',
            4000
          );
        }
      },
      error: (err) => {
        console.error('Error obteniendo dirección de destino:', err);
        this._toastService.showDanger(
          'Error',
          'Ocurrió un error al calcular la dirección de destino.',
          4000
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
            3000
          );
        } else {
          // Mostrar toast de error
          this._toastService.showDanger(
            'Dirección incorrecta',
            'No se pudo calcular la dirección de origen.',
            4000
          );
        }
      },
      error: (err) => {
        console.error('Error obteniendo dirección de origen:', err);
        this._toastService.showDanger(
          'Error',
          'Ocurrió un error al calcular la dirección de origen.',
          4000
        );
      },
    });
  }
}
