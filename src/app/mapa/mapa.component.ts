import { Component, AfterViewInit, ViewChild, ElementRef, Input, OnChanges, SimpleChanges, NgZone, HostListener } from '@angular/core';
import L from 'leaflet';
import { EstabelecimentosService } from '../services/estabelecimentos.service';
import { Estabelecimento } from '../estabelecimento.model';
import { firstValueFrom, Subject, takeUntil, combineLatest, filter, BehaviorSubject, switchMap, tap, map, take } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { FormsModule } from '@angular/forms';
import 'leaflet-routing-machine';
import { CommonModule } from '@angular/common';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SwPush } from '@angular/service-worker';

import { MapStateService } from '../services/map-state.service';
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
    MatTooltipModule,
    MatRippleModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss',
})
export class MapaComponent implements AfterViewInit, OnChanges {
  @ViewChild('map', { static: true }) mapElementRef!: ElementRef<HTMLDivElement>;
  private location$ = new BehaviorSubject<{ lat: number; lng: number } | null>(null);

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
  private bottomSheetEl: HTMLElement | null = null;
  installPrompt: any = null;
  showInstallBanner = true;
  private destroy$ = new Subject<void>();
  isLoading = true; // <-- Adicionado para controlar o spinner

  constructor(
    private estabelecimentoService: EstabelecimentosService,
    private _ngZone: NgZone,
    private _elementRef: ElementRef<HTMLElement>,
    private swPush: SwPush,
    private _snackBar: MatSnackBar,
    private notificationService: NotificationService,
    private mapStateService: MapStateService
  ) {
    this.initializeDataFlow();
  }

  private getUserLocation(): void {
    console.log(`[LOG ${new Date().toLocaleTimeString()}] 2. Solicitando localização do navegador...`);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          console.log(`[LOG ${new Date().toLocaleTimeString()}] 3. ✅ Localização recebida do navegador:`, { lat: coords.latitude, lng: coords.longitude });
          this.location$.next({ lat: coords.latitude, lng: coords.longitude });
        },
        (error) => {
          console.error(`[LOG ${new Date().toLocaleTimeString()}] 3. ❌ Erro ao obter localização, usando fallback:`, error);
          this.location$.next({ lat: -23.55052, lng: -46.633308 }); // Fallback para SP
        },
        {
          enableHighAccuracy: true, // Tenta obter a localização mais precisa possível
          timeout: 10000, // Tempo máximo de 10 segundos para obter a localização
          maximumAge: 60000 // Permite o uso de uma localização em cache de até 1 minuto. Melhora muito a velocidade.
        }
      );
    } else {
      console.error(`[LOG ${new Date().toLocaleTimeString()}] 3. ❌ Geolocalização não suportada, usando fallback.`);
      this.location$.next({ lat: -23.55052, lng: -46.633308 });
    }
  }

  // @HostListener('window:beforeinstallprompt', ['$event'])
  // onBeforeInstallPrompt(event: any) {
  //   // // Previne que o mini-infobar do Chrome apareça em mobile.
  //   // event.preventDefault();
  //   // // Guarda o evento para que ele possa ser acionado depois.
  //   // this.installPrompt = event;
  //   // this.showInstallBanner = true;
  // }

  ngAfterViewInit(): void {
    // Inicializa o mapa imediatamente com uma visão padrão, sem esperar pela geolocalização.
    // Isso evita a "tela branca" enquanto a localização é obtida.
    this.inicializarMapa(-14.235, -51.925, 4); // Centro do Brasil, zoom afastado
    this.bottomSheetEl = this._elementRef.nativeElement.querySelector('#bottomSheet');
    this.initializeDataFlow(); // Inicia o fluxo para obter a localização do usuário após o mapa base estar visível.
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // A lógica de inicialização agora é controlada internamente pelo componente.
    // Este método pode ser removido se não for mais usado para outras @Inputs.
  }

  private initializeDataFlow(): void {
    console.log(`[LOG ${new Date().toLocaleTimeString()}] 1. Iniciando fluxo de dados.`);
    // 1. Obtém a localização do usuário (o mapa já está visível neste ponto)
    this.getUserLocation();

    // 2. Cria um fluxo de dados para os estabelecimentos
    const estabelecimentos$ = this.location$.pipe(
      filter((loc): loc is { lat: number; lng: number } => loc !== null),
      tap(loc => console.log(`[LOG ${new Date().toLocaleTimeString()}] 4. Localização válida recebida. Disparando chamada para API de estabelecimentos...`)),
      switchMap(loc =>
        this.estabelecimentoService.getEstabelecimentosProximos(loc.lat, loc.lng).pipe(map(response => response.body ?? [] as Estabelecimento[]))
      ),
      tap(estabelecimentos => {
        this.todosEstabelecimentos = estabelecimentos;
        this.ajustarRaioInicial();
        this.carregarEstabelecimentos(); // <-- Adiciona os marcadores no mapa
      }),
      takeUntil(this.destroy$)
    );

    // 3. Combina o fluxo de seleção com o fluxo de estabelecimentos
    combineLatest([
      this.mapStateService.selectEstablishment$,
      estabelecimentos$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([selectedId, estabelecimentos]) => {
      const est = estabelecimentos.find(e => e.id === selectedId);
      if (est) {
        this.selecionarEstabelecimento(est);
      }
    });

    // 4. Centraliza no usuário e adiciona marcadores assim que a primeira localização estiver disponível
    this.location$.pipe(
      filter((loc): loc is { lat: number; lng: number } => loc !== null),
      tap(() => this.isLoading = false), // <-- Esconde o spinner
      take(1) // Apenas na primeira vez
    ).subscribe(loc => {
      this.centralizarNoUsuario(loc.lat, loc.lng);
    });
  }

  private inicializarMapa(latitude: number, longitude: number, zoom: number): void {
    if (this.map) return;

    this.map = L.map(this.mapElementRef.nativeElement).setView([latitude, longitude], zoom);
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
        // Executa dentro da zona do Angular para garantir a atualização da UI a partir de eventos de libs externas
        this._ngZone.run(() => {
          this.isListOpen = false;
        });
      }
    });
  }

  /**
   * Centraliza o mapa na localização do usuário, adiciona o marcador e o círculo de raio.
   * Chamado após a geolocalização ser obtida.
   */
  private centralizarNoUsuario(latitude: number, longitude: number): void {
    if (!this.map) return;

    // Adiciona o marcador do usuário
    this.userMarker = L.marker([latitude, longitude],{
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

    // Adiciona o círculo de raio
    this.circle = L.circle([latitude, longitude], {
      color: '#c299fc',
      fillColor: '#f7c7ce',
      fillOpacity: 0.35,
      radius: this.raio
    }).addTo(this.map);

    // Move o mapa suavemente para a nova localização com o zoom apropriado
    const zoomLevel = this.calculateZoomLevel(this.raio);
    this.map.flyTo([latitude, longitude], zoomLevel);
  }

  private atualizarLocalizacaoMapa(): void {
    const loc = this.location$.value;
    if (!this.map || !loc) return;
    const newLatLng = new L.LatLng(loc.lat, loc.lng);
    this.map.setView(newLatLng);

    if (this.userMarker) {
      this.userMarker.setLatLng(newLatLng);
    }
    if (this.circle) {
      this.circle.setLatLng(newLatLng);
    }
  }

  private carregarEstabelecimentos(): void {
    if (!this.map || !this.location$.value) return;

    // Limpa os marcadores de estabelecimentos anteriores
    this.establishmentMarkers.forEach(marker => marker.remove());
    this.establishmentMarkers = [];

    for (const estabelecimento of this.todosEstabelecimentos) {
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
      }).on('click', () => this._ngZone.run(() => this.selecionarEstabelecimento(estabelecimento)));

      if (this.map) marker.addTo(this.map);
      this.establishmentMarkers.push(marker);
    }
  }

  private ajustarRaioInicial(): void {
    const raiosBusca = [500, 1000, 5000];
    let raioEncontrado = this.raio;

    for (const raio of raiosBusca) {
      const raioEmKm = raio / 1000;
      const estabelecimentosNoRaio = this.todosEstabelecimentos.filter(est => (est.distanciaKm ?? Infinity) <= raioEmKm);
      if (estabelecimentosNoRaio.length > 0) {
        raioEncontrado = raio;
        break;
      }
    }

    // Define o raio e atualiza o mapa (círculo e zoom)
    this.definirRaio(raioEncontrado);
  }

  alternarLista(): void {
    this.isListOpen = !this.isListOpen;
  }

  /**
   * Seleciona um estabelecimento, fecha a lista e centraliza o mapa nele.
   * Esta função é chamada tanto pelo clique no mapa/lista quanto pelo serviço de estado.
   * Para resolver o problema de clique repetido, limpamos a seleção antes de definir a nova.
   * @param est O estabelecimento a ser selecionado.
   */
  selecionarEstabelecimento(est: Estabelecimento): void {
    // Força a re-seleção mesmo que o ID seja o mesmo, limpando e reabrindo.
    if (this.selectedEstabelecimento?.id === est.id && this.selectedEstabelecimento !== null) {
      this.selectedEstabelecimento = null;
      // Garante que a UI tenha tempo de processar a remoção antes de re-adicionar
      setTimeout(() => this._ngZone.run(() => this.selectedEstabelecimento = est), 10);
      return;
    }
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

  instalarPWA(): void {
    if (!this.installPrompt) {
      return;
    }
    // Mostra o prompt de instalação
    this.installPrompt.prompt();
    // O evento só pode ser usado uma vez.
    this.installPrompt = null;
  }

  dismissInstallBanner(): void {
    this.showInstallBanner = false;
  }

  fecharDetalhe(recentralizar = true): void {
    this.selectedEstabelecimento = null;
    if (this.routingControl) {
      this.routingControl.remove();
      this.routingControl = null;
    }
    const loc = this.location$.value;
    if (recentralizar && this.map && loc) {
      const zoomLevel = this.calculateZoomLevel(this.raio);
      this.map.flyTo([loc.lat, loc.lng], zoomLevel);
    }

    // Desabilita o zoom ao sair do modo de navegação
    if (this.map) {
      this.map.scrollWheelZoom.disable();
      this.map.touchZoom.disable();
      this.map.doubleClickZoom.disable();
    }
  }

  iniciarNavegacao(est: Estabelecimento, event: MouseEvent): void {
    event.stopPropagation(); // Impede que o clique se propague para outros elementos

    // 1. Fecha o modal de detalhes sem recentralizar o mapa
    this.fecharDetalhe(false);

    const loc = this.location$.value;
    if (!this.map || !loc) return;

    // 2. Remove qualquer rota anterior
    if (this.routingControl) {
      this.routingControl.remove();
    }

    // 3. Cria e exibe a nova rota
    this.routingControl = L.Routing.control({
      routeWhileDragging: true,
      show: false, // Oculta o painel de instruções
      addWaypoints: false,
      fitSelectedRoutes: false, // Desativamos o ajuste automático para controlar manualmente
      lineOptions: {
        styles: [{color: '#6200ee', opacity: 0.8, weight: 6}]
      } as any,
      plan: L.Routing.plan([
        L.latLng(loc.lat, loc.lng),
        L.latLng(est.latitude, est.longitude)
      ], {
        // Esta função impede a criação dos marcadores de início e fim
        createMarker: function() { return false; }
      })
    }).addTo(this.map);

    // 4. Ajusta o mapa manualmente para enquadrar a rota
    const bounds = L.latLngBounds([
      L.latLng(loc.lat, loc.lng),
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

  async seguirEstabelecimento(est: Estabelecimento, event: MouseEvent): Promise<void> {
    event.stopPropagation(); // Impede que o clique feche o card

    if (!this.swPush.isEnabled) {
      this._snackBar.open('As notificações push não são suportadas ou estão desabilitadas.', 'Fechar', {
        duration: 5000,
        panelClass: ['pao-quentinho-snackbar']
      });
      return;
    }

    try {
      // Busca a chave VAPID do backend
      const vapidPublicKey = await firstValueFrom(this.notificationService.getVapidPublicKey());

      if (!vapidPublicKey) {
        throw new Error('Chave VAPID pública não recebida do servidor.');
      }

      // Solicita a inscrição ao navegador
      const sub = await this.swPush.requestSubscription({
        serverPublicKey: vapidPublicKey,
      });

      // Envia a inscrição para o backend
      await firstValueFrom(this.notificationService.addPushSubscriber(sub, est.id));

      console.log('Inscrição para Push Notification obtida e salva:', sub.toJSON());
      this._snackBar.open(`Inscrição realizada com sucesso para a ${est.nome}!`, 'Ok', {
        duration: 3000,
        panelClass: ['pao-quentinho-snackbar']
      });
    } catch (err) {
      console.error('Não foi possível se inscrever para notificações push', err);
      this._snackBar.open('Não foi possível se inscrever. Verifique se as notificações não estão bloqueadas.', 'Fechar', {
        duration: 5000,
        panelClass: ['pao-quentinho-snackbar']
      });
    }
  }

  async compartilharEstabelecimento(est: Estabelecimento | null, event: MouseEvent): Promise<void> {
    event.stopPropagation(); // Impede que o clique feche o card

    if (!est) return;

    const shareData = {
      title: `Pão Quentinho: ${est.nome}`,
      text: `Confira este lugar que encontrei no Pão Quentinho! ${est.nome}`,
      url: `https://pao-quentinho-production.up.railway.app/estabelecimento/${est.id}`
    };

    // Verifica se a Web Share API está disponível no navegador
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        console.log('Conteúdo compartilhado com sucesso!');
      } catch (err) {
        // O erro 'AbortError' é comum se o usuário cancelar o compartilhamento, então não o tratamos como um erro real.
        if ((err as DOMException).name !== 'AbortError') {
          console.error('Erro ao compartilhar:', err);
        }
      }
    } else {
      // Fallback para desktops: Copiar para a área de transferência
      try {
        await navigator.clipboard.writeText(shareData.url);
        this._snackBar.open('Link do estabelecimento copiado para a área de transferência!', 'Ok', {
          duration: 3000
        });
      } catch (err) {
        console.error('Erro ao copiar para a área de transferência:', err);
        this._snackBar.open('Não foi possível copiar o link.', 'Fechar', {
          duration: 3000
        });
      }
    }
  }

  definirRaio(novoRaio: number): void {
    this.raio = novoRaio;
    const loc = this.location$.value;
    if (this.map && this.circle && loc) {
      this.circle.setRadius(this.raio);
      const userLocation = new L.LatLng(loc.lat, loc.lng);
      // Ajusta o zoom para o novo raio
      const zoomLevel = this.calculateZoomLevel(this.raio);
      this.filtrarEstabelecimentos();
      // Centraliza o mapa na localização do usuário com uma animação suave
      this.map.flyTo(userLocation, zoomLevel);
    } else {
      // Se o mapa não estiver pronto, apenas filtra os dados.
      this.filtrarEstabelecimentos();
    }
  }

  private filtrarEstabelecimentos(): void {
    const raioEmKm = this.raio / 1000;
    this.estabelecimentosVisiveis = this.todosEstabelecimentos
      .filter(est => (est.distanciaKm ?? Infinity) <= raioEmKm)
      .sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity));
  }

  // --- Lógica de Arrastar o Bottom Sheet ---
  private touchStartY = 0;

  protected onTouchStart(event: TouchEvent): void {
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

  protected onTouchMove(event: TouchEvent): void {
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
  }

  protected onTouchEnd(event: TouchEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    const sheetEl = this.bottomSheetEl;
    if (!sheetEl) return;

    sheetEl.classList.remove('dragging');
    sheetEl.style.transform = ''; // Deixa o CSS controlar a posição final

    const touchEndY = event.changedTouches[0].clientY;
    const deltaY = touchEndY - this.touchStartY;

    // Decide se abre ou fecha com base na direção e intensidade do deslize
    if (deltaY < -SWIPE_THRESHOLD) this.isListOpen = true; // Deslizou para cima
    if (deltaY > SWIPE_THRESHOLD) this.isListOpen = false; // Deslizou para baixo
  }

  private calculateZoomLevel(radiusInMeters: number): number {
    // Fórmula aproximada para obter um nível de zoom razoável para um raio
    const zoomLevels = { 500: 16, 1000: 15, 5000: 13 };
    return zoomLevels[radiusInMeters as keyof typeof zoomLevels] || 12;
  }

  /**
   * Encontra o próximo horário de fornada do dia.
   * @param horarios Array de horários no formato "HH:mm".
   * @returns O próximo horário ou o primeiro do dia seguinte se todos já passaram.
   */
  getNextFornada(horarios: string[]): string {
    if (!horarios || horarios.length === 0) {
      return 'N/A';
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const proximoHorario = horarios
      .map(h => ({ str: h, mins: parseInt(h.split(':')[0]) * 60 + parseInt(h.split(':')[1]) }))
      .find(h => h.mins > currentMinutes);

    return proximoHorario ? proximoHorario.str : horarios[0]; // Se todos já passaram, mostra o primeiro do dia seguinte
  }
}
