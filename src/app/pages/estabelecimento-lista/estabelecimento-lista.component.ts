import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapaComponent } from '../../mapa/mapa.component';

@Component({
  selector: 'app-estabelecimento-lista',
  standalone: true,
  imports: [CommonModule, MapaComponent],
  templateUrl: './estabelecimento-lista.component.html',
  styleUrl: './estabelecimento-lista.component.scss'
})
export class EstabelecimentoListaComponent {
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
          this.latitude = -23.55052;
          this.longitude = -46.633308;
          console.error('Erro ao obter localização:', error);
        }
      );
    }
  }
}