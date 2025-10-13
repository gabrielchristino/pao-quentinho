import { Component, AfterViewInit, ViewChild, ElementRef, Input, OnChanges, SimpleChanges, NgZone } from '@angular/core';
import * as L from 'leaflet';
import { Estabelecimento, EstabelecimentosService } from '../services/estabelecimentos.service';
import { FormsModule } from '@angular/forms';
import 'leaflet-routing-machine';
import { CommonModule } from '@angular/common';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';

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

// --- Constantes ---
const BOTTOM_SHEET_PEEK_HEIGHT = 80; // Altura visível quando o painel está fechado
const SWIPE_THRESHOLD = 50; // Distância mínima em pixels para considerar um gesto de swipe


@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    MatBottomSheetModule,
    MatListModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule
  ],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss',
})
export class MapaComponent implements AfterViewInit, OnChanges {
  private _exitRouteTooltip: MatTooltip | undefined;
  @ViewChild('exitRouteTooltip') set exitRouteTooltip(tooltip: MatTooltip | undefined) {
    if (tooltip && tooltip !== this._exitRouteTooltip) {
      this._exitRouteTooltip = tooltip;
      // Usamos um setTimeout para garantir que o tooltip seja exibido após a renderização do botão.
      this._ngZone.runOutsideAngular(() => {
        setTimeout(() => tooltip.show(), 0);
      });
    }
  }
  @ViewChild('map', { static: true }) mapElementRef!: ElementRef<HTMLDivElement>;
  @Input() latitude: number | null = null;
  @Input() longitude: number | null = null;
  raio: number = 500; // Raio inicial em metros
  private map?: L.Map;
  private circle?: L.Circle;
  private userMarker?: L.Marker;
  private establishmentMarkers: L.Marker[] = [];
  routingControl: L.Routing.Control | null = null;
  todosEstabelecimentos: Estabelecimento[] = [];
  estabelecimentosVisiveis: Estabelecimento[] = [];
  selectedEstabelecimento: Estabelecimento | null = null;
  isListOpen = false;
  isDragging = false;
  private touchStartY = 0;
  private currentTranslateY = 0;
  private bottomSheetEl: HTMLElement | null = null;

  constructor(
    private estabelecimentoService: EstabelecimentosService,
    private _ngZone: NgZone,
    private _elementRef: ElementRef<HTMLElement>
  ) {}

  ngAfterViewInit(): void {
    this.bottomSheetEl = this._elementRef.nativeElement.querySelector('#bottomSheet');
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Verifica se temos coordenadas válidas
    if (this.latitude !== null && this.longitude !== null) {
      if (!this.map) {
        // Se o mapa não foi inicializado, inicializa agora com as coordenadas recebidas.
        this.initMap();
      } else {
        // Se o mapa já existe e as coordenadas mudaram, apenas atualiza a localização.
        this.updateMapLocation();
      }
    }
  }

  private updateMapLocation(): void {
    if (!this.map || this.latitude === null || this.longitude === null) return;
    const newLatLng = new L.LatLng(this.latitude, this.longitude);
    this.map.setView(newLatLng);

    if (this.userMarker) {
      this.userMarker.setLatLng(newLatLng);
    }
    if (this.circle) {
      this.circle.setLatLng(newLatLng);
    }
    this.loadEstabelecimentos();
  }

  private initMap(): void {
    if (this.map || this.latitude === null || this.longitude === null) return;
    const zoomLevel = this.calculateZoomLevel(this.raio);
    this.map = L.map(this.mapElementRef.nativeElement).setView([this.latitude, this.longitude], zoomLevel);
    this.map.zoomControl.remove();
    this.map.scrollWheelZoom.disable();
    this.map.touchZoom.disable();
    this.map.doubleClickZoom.disable();

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    // Adiciona o evento de clique no mapa para fechar o bottom sheet
    this.map.on('click', () => {
      if (this.isListOpen) {
        // Executa dentro da zona do Angular para garantir a atualização da UI
        this._ngZone.run(() => {
          this.isListOpen = false;
        });
      }
    });

    this.userMarker = L.marker([this.latitude, this.longitude],{
      alt: 'Localização atual',
      title: 'Localização atual',
      riseOnHover: true,
      icon: L.icon({
        iconUrl: 'assets/icons/current-location.png',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })
    }).addTo(this.map);

    this.circle = L.circle([this.latitude, this.longitude], {
      color: '#c299fc',
      fillColor: '#f7c7ce',
      fillOpacity: 0.35,
      radius: this.raio
    }).addTo(this.map);

    this.loadEstabelecimentos();
  }

  private loadEstabelecimentos(): void {
    if (!this.map || this.latitude === null || this.longitude === null) return;

    // Limpa os marcadores de estabelecimentos anteriores
    this.establishmentMarkers.forEach(marker => marker.remove());
    this.establishmentMarkers = [];

    this.estabelecimentoService.getEstabelecimentosProximos(this.latitude, this.longitude).subscribe(response => {
      const estabelecimentos = response.body ?? [];
      this.todosEstabelecimentos = estabelecimentos;
      this.ajustarRaioInicial();
      for (const estabelecimento of estabelecimentos) {
        const marker = L.marker([estabelecimento.latitude, estabelecimento.longitude], {
          alt: estabelecimento.nome,
          title: estabelecimento.nome,
          riseOnHover: true,
          icon: L.icon({
            iconUrl: `assets/icons/${estabelecimento.tipo}.png`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
          })
        });

        marker.on('click', () => {
          this._ngZone.run(() => {
            this.selecionarEstabelecimento(estabelecimento);
          });
        });

        if (this.map) {
          marker.addTo(this.map);
        }
        this.establishmentMarkers.push(marker);
      }
    });
  }

  private ajustarRaioInicial(): void {
    const raiosBusca = [500, 1000, 5000];
    let raioEncontrado = this.raio;

    for (const raio of raiosBusca) {
      const raioEmKm = raio / 1000;
      const estabelecimentosNoRaio = this.todosEstabelecimentos.filter(est => est.distanciaKm <= raioEmKm);
      if (estabelecimentosNoRaio.length > 0) {
        raioEncontrado = raio;
        break;
      }
    }

    // Define o raio e atualiza o mapa (círculo e zoom)
    this.definirRaio(raioEncontrado);
  }

  toggleList(): void {
    this.isListOpen = !this.isListOpen;
  }

  selecionarEstabelecimento(est: Estabelecimento): void {
    this.selectedEstabelecimento = est;
    this.isListOpen = false; // Fecha a lista para dar espaço ao card de detalhe
    if (this.routingControl) {
      this.routingControl.remove();
      this.routingControl = null;
    }
    if (this.map) {
      this.map.flyTo([est.latitude, est.longitude], 17); // 17 é um bom nível de zoom para ver de perto
    }
  }

  fecharDetalhe(recentralizar = true): void {
    this._exitRouteTooltip?.hide(0); // Esconde o tooltip imediatamente ao fechar
    this.selectedEstabelecimento = null;
    if (this.routingControl) {
      this.routingControl.remove();
      this.routingControl = null;
    }
    if (recentralizar && this.map && this.latitude !== null && this.longitude !== null) {
      const zoomLevel = this.calculateZoomLevel(this.raio);
      this.map.flyTo([this.latitude, this.longitude], zoomLevel);
    }

    // Desabilita o zoom ao sair do modo de navegação
    if (this.map) {
      this.map.scrollWheelZoom.disable();
      this.map.touchZoom.disable();
      this.map.doubleClickZoom.disable();
    }
  }

  mostrarRota(est: Estabelecimento, event: MouseEvent): void {
    event.stopPropagation(); // Impede que o clique no endereço feche o card de detalhes
    if (!this.map || this.latitude === null || this.longitude === null) return;

    // Remove a rota anterior, se houver
    if (this.routingControl) {
      this.routingControl.remove();
    }

    this.routingControl = L.Routing.control({
      waypoints: [
        L.latLng(this.latitude, this.longitude),
        L.latLng(est.latitude, est.longitude)
      ],
      routeWhileDragging: true,
      show: false, // Oculta o painel de instruções de rota (se houver)
      addWaypoints: false, // Impede que o usuário adicione/mova os pontos da rota
      fitSelectedRoutes: false, // Desativamos o ajuste automático do plugin
      lineOptions: {
        styles: [{color: '#6200ee', opacity: 0.8, weight: 6}]
      } as any // Adicionado para contornar tipagem estrita
    }).addTo(this.map);

    // Ajusta o mapa manualmente APÓS a rota ser encontrada
    this.routingControl.on('routesfound', (e) => {
      if (this.map) {
        const routes = (e as any).routes;
        if (routes && routes.length > 0) {
          const bounds = routes[0].bounds;
          const cardEl = this._elementRef.nativeElement.querySelector('.establishment-card');
          const cardHeight = cardEl ? cardEl.clientHeight + 24 : 150; // Pega a altura do card + um respiro

          this.map.fitBounds(bounds, { paddingBottomRight: [0, cardHeight] });
        }
      }
    });
  }

  iniciarNavegacao(est: Estabelecimento, event: MouseEvent): void {
    event.stopPropagation(); // Impede que o clique se propague para outros elementos

    // 1. Fecha o modal de detalhes sem recentralizar o mapa
    this.fecharDetalhe(false);

    if (!this.map || this.latitude === null || this.longitude === null) return;

    // 2. Remove qualquer rota anterior
    if (this.routingControl) {
      this.routingControl.remove();
    }

    // 3. Cria e exibe a nova rota
    this.routingControl = L.Routing.control({
      waypoints: [
        L.latLng(this.latitude, this.longitude),
        L.latLng(est.latitude, est.longitude)
      ],
      routeWhileDragging: true,
      show: false, // Oculta o painel de instruções
      addWaypoints: false,
      fitSelectedRoutes: false, // Desativamos o ajuste automático para controlar manualmente
      lineOptions: {
        styles: [{color: '#6200ee', opacity: 0.8, weight: 6}]
      } as any
    }).addTo(this.map);

    // 4. Ajusta o mapa manualmente para enquadrar a rota
    const bounds = L.latLngBounds([
      L.latLng(this.latitude, this.longitude),
      L.latLng(est.latitude, est.longitude)
    ]);

    // Adiciona um "respiro" (padding) nas bordas do mapa
    this.map.fitBounds(bounds, { padding: [50, 50] });

    // 5. Habilita o zoom no modo de navegação
    if (this.map) {
      this.map.scrollWheelZoom.enable();
      this.map.touchZoom.enable();
      this.map.doubleClickZoom.enable();
    }
  }

  seguirEstabelecimento(est: Estabelecimento, event: MouseEvent): void {
    event.stopPropagation(); // Impede que o clique feche o card
    alert(`Você agora está seguindo a ${est.nome}!`);
    // Aqui você implementaria a lógica de inscrição
  }

  onTouchStart(event: TouchEvent): void {
    // Ignora o gesto se o scroll interno da lista estiver ativo
    const sheetContent = (event.currentTarget as HTMLElement).querySelector('.sheet-content');
    if (sheetContent && sheetContent.scrollTop > 0) {
      this.isDragging = false;
      return;
    }

    this.isDragging = true;
    // Guarda a posição inicial do toque no eixo Y
    this.touchStartY = event.touches[0].clientY;
    this.bottomSheetEl?.classList.add('dragging');
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return;

    const sheetEl = this.bottomSheetEl;
    if (!sheetEl) return;

    const touchMoveY = event.touches[0].clientY;
    const deltaY = touchMoveY - this.touchStartY;

    // Posição inicial (aberto ou fechado) + deslocamento do dedo
    const startY = this.isListOpen ? 0 : sheetEl.clientHeight - BOTTOM_SHEET_PEEK_HEIGHT;
    const newTranslateY = startY + deltaY;

    // Limita o movimento para não "estourar" os limites da tela
    const constrainedY = Math.max(0, newTranslateY);

    sheetEl.style.transform = `translateY(${constrainedY}px)`;
    sheetEl.style.transition = 'none'; // Remove a transição durante o arraste
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    const sheetEl = this.bottomSheetEl;
    if (!sheetEl) return;

    sheetEl.classList.remove('dragging');
    sheetEl.style.transform = ''; // Deixa o CSS controlar a posição final
    sheetEl.style.transition = ''; // Restaura a transição

    const touchEndY = event.changedTouches[0].clientY;
    const deltaY = touchEndY - this.touchStartY;

    // Decide se abre ou fecha com base na direção e intensidade do deslize
    if (deltaY < -SWIPE_THRESHOLD) this.isListOpen = true; // Deslizou para cima
    if (deltaY > SWIPE_THRESHOLD) this.isListOpen = false; // Deslizou para baixo
  }

  definirRaio(novoRaio: number): void {
    this.raio = novoRaio;
    if (this.map && this.circle && this.latitude !== null && this.longitude !== null) {
      this.circle.setRadius(this.raio);
      const userLocation = new L.LatLng(this.latitude, this.longitude);
      // Ajusta o zoom para o novo raio
      const zoomLevel = this.calculateZoomLevel(this.raio);
      this.filtrarEstabelecimentos();
      // Centraliza o mapa na localização do usuário com uma animação suave
      this.map.flyTo(userLocation, zoomLevel);
    }
  }

  private filtrarEstabelecimentos(): void {
    const raioEmKm = this.raio / 1000;
    this.estabelecimentosVisiveis = this.todosEstabelecimentos
      .filter(est => est.distanciaKm <= raioEmKm)
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
  }

  private calculateZoomLevel(radiusInMeters: number): number {
    // Fórmula aproximada para obter um nível de zoom razoável para um raio
    const zoomLevels = { 500: 16, 1000: 15, 5000: 13 };
    return zoomLevels[radiusInMeters as keyof typeof zoomLevels] || 12;
  }
}
