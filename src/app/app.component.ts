import { Component, AfterViewInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import * as L from 'leaflet';
import { EstabelecimentosService } from './estabelecimentos.service';

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
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements AfterViewInit {
  @ViewChild('map', { static: true }) mapElementRef!: ElementRef<HTMLDivElement>;
  private map?: L.Map;

  private readonly defaultCoords = { lat: -23.55052, lng: -46.633308 }; // São Paulo

  private initMap(latitude: number, longitude: number): void {
    this.map = L.map(this.mapElementRef.nativeElement, {
      zoom: 16
    }).setView([latitude, longitude], 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 3,
      
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    console.log('Mapa inicializado com coordenadas:', latitude, longitude);

    L.marker([latitude, longitude],{
      alt: 'Localização atual',
      title: 'Localização atual',
      riseOnHover: true,
      icon: L.icon({
        iconUrl: 'assets/icons/current-location.png',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
      
    }).addTo(this.map)

    L.circle([latitude, longitude], {
        color: '#c299fc', // lilás pastel
        fillColor: '#f7c7ce', // rosa claro
        fillOpacity: 0.35,
        radius: 500
    }).addTo(this.map);

    this.estabelecimentoService.getEstabelecimentosProximos(latitude, longitude).subscribe(response => {
      const estabelecimentos = response.body ?? [];
      estabelecimentos.forEach(estabelecimento => {
        L.marker([estabelecimento.latitude, estabelecimento.longitude], {
          alt: estabelecimento.nome,
          title: estabelecimento.nome,
          riseOnHover: true,
          icon: L.icon({
            iconUrl: `assets/icons/${estabelecimento.tipo}.png` ,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
          })
        })
          .addTo(this.map!)
          .bindPopup(`
            <b>${estabelecimento.nome}</b><br><br>
            Próxima fornada quentinha às <b>${estabelecimento.proximaFornada}</b><br><br>
            ${estabelecimento.info}<br><br>
            ${estabelecimento.endereco.rua}, ${estabelecimento.endereco.numero} - ${estabelecimento.endereco.bairro}<br>
            ${estabelecimento.endereco.cidade} - ${estabelecimento.endereco.estado}<br>
            distância ${estabelecimento.distanciaKm.toFixed(2)} km
          `, {maxWidth: window.innerWidth - 100});
      });
    });
  }

  constructor(
    private estabelecimentoService: EstabelecimentosService
  ) {}

  ngAfterViewInit(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => this.initMap(coords.latitude, coords.longitude),
        (error) => {
          console.error('Erro ao obter localização:', error);
          this.initMap(this.defaultCoords.lat, this.defaultCoords.lng);
        }
      );
    } else {
      console.error('Geolocalização não é suportada por este navegador.');
      this.initMap(this.defaultCoords.lat, this.defaultCoords.lng);
    }
  }
}
