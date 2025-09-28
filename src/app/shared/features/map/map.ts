import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, inject, Input } from '@angular/core';
import * as L from 'leaflet';

import { MapService } from './map-service';

@Component({
  selector: 'app-map',
  // Asegúrate de que tu componente sea standalone o esté en un módulo
  standalone: true,
  imports: [],
  templateUrl: './map.html',
  styleUrl: './map.scss',
  providers: [HttpClient],
})
export class Map implements AfterViewInit {
  @Input() localidadOrigen?: string = '';
  @Input() ciudadOrigen?: string = '';
  @Input() direccionOrigen?: string = '';
  @Input() localidadDestino?: string = '';
  @Input() ciudadDestino?: string = '';
  @Input() direccionDestino?: string = '';
  private map: L.Map | undefined;
  private _mapService = inject(MapService);
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

    // 2. Coordenadas aproximadas para "Garibaldi 1700, Zárate"
    const zarateCoords: L.LatLngExpression = [-34.095, -59.035];

    // 3. Centramos el mapa directamente en las coordenadas y con más zoom
    this.map = L.map('map').setView(zarateCoords, 11); // Zoom 17 para ver a nivel de calle

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
  }

  ngAfterViewInit(): void {
    // Usamos un pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
      this.initMap();
      this.showRouteOnMap();
    });
  }
  // Dibuja el recorrido entre origen y destino
  showRouteOnMap() {
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
        return;
      }
      // Marcar el origen
      const origenMarker = L.marker(origenCoords, { icon: this.origenIcon })
        .addTo(this.map!)
        .bindPopup('Origen: ' + origenAddress);

      // Obtener coordenadas de destino
      this._mapService
        .getCoordinates(destinoAddress)
        .subscribe((destinoCoords) => {
          if (!destinoCoords || !this.map) {
            console.error('No se encontraron coordenadas para el destino.');
            return;
          }
          // Marcar el destino
          const destinoMarker = L.marker(destinoCoords, {
            icon: this.destinoIcon,
          })
            .addTo(this.map!)
            .bindPopup('Destino: ' + destinoAddress)
            .openPopup();

          // Dibujar la línea entre origen y destino
          const route = L.polyline([origenCoords, destinoCoords], {
            color: 'blue',
            weight: 4,
          }).addTo(this.map!);

          // Ajustar el mapa para mostrar ambos puntos
          const group = L.featureGroup([origenMarker, destinoMarker, route]);
          this.map!.fitBounds(group.getBounds().pad(0.2));
        });
    });
  }
}
