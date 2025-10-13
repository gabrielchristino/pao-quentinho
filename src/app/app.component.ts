import { Component, AfterViewInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import * as L from 'leaflet';
import { EstabelecimentosService } from './services/estabelecimentos.service';
import { MapaComponent } from './mapa/mapa.component';

const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MapaComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  latitude: number | null = null;
  longitude: number | null = null;

  constructor() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          this.latitude = coords.latitude;
          this.longitude = coords.longitude;
          console.log('Localização obtida - latitude:', this.latitude, 'longitude:', this.longitude); 
        },
        (error) => {
          // Fallback para SP em caso de erro
          this.latitude = -23.55052;
          this.longitude = -46.633308;
          console.error('Erro ao obter localização:', error);
        }
      );
    } else {
      console.error('Geolocalização não é suportada por este navegador.');
      // Fallback para SP se não for suportada
      this.latitude = -23.55052;
      this.longitude = -46.633308;
    }
  }
}
