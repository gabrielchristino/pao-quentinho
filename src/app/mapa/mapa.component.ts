import { Component, AfterViewInit, ViewChild, ElementRef, Input, OnChanges, SimpleChanges, NgZone, HostListener } from '@angular/core';
import L from 'leaflet';
import { EstabelecimentosService } from '../services/estabelecimentos.service';
import { Estabelecimento } from '../estabelecimento.model';
import { firstValueFrom, Subject, takeUntil, combineLatest, filter, BehaviorSubject, switchMap, tap, map, take, finalize } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import 'leaflet-routing-machine';
import { CommonModule } from '@angular/common';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatRippleModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SwPush } from '@angular/service-worker';

import { MapStateService } from '../services/map-state.service';
import { PermissionDialogComponent, PermissionDialogData } from './permission-diolog.component';
import { AuthService } from '../services/auth.service';
import { AuthDialogComponent } from '../auth-dialog/auth-dialog.component';
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
const BOTTOM_SHEET_PEEK_HEIGHT = 80;
const SWIPE_THRESHOLD = 50;

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatBottomSheetModule,
    MatListModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatMenuModule,
    MatRippleModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    
  ],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss', 
  host: {
    '[style.display]': "'block'",
    '[style.height]': "'100%'",
    '[style.overflow]': "'hidden'"
  }
})
export class MapaComponent implements AfterViewInit {
  @ViewChild('map', { static: true }) mapElementRef!: ElementRef<HTMLDivElement>;
  location$ = new BehaviorSubject<{ lat: number; lng: number } | null>(null);
  searchControl = new FormControl('');

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
  private locationWatchId: number | null = null;
  private destroy$ = new Subject<void>();
  isLoading = true;
  private isLocationOverridden = false; // Flag para controlar a centralização

  constructor(
    private estabelecimentoService: EstabelecimentosService,
    private _ngZone: NgZone,
    private _elementRef: ElementRef<HTMLElement>,
    private swPush: SwPush,
    private _snackBar: MatSnackBar,
    private notificationService: NotificationService,
    private mapStateService: MapStateService,
    public dialog: MatDialog,
    public authService: AuthService
  ) { 
    // Adiciona a classe ao body para desabilitar o scroll global
    // quando este componente está ativo.
    this._elementRef.nativeElement.ownerDocument.body.classList.add('no-scroll');
  }

  private async solicitarPermissaoDeLocalizacao(): Promise<void> {
    console.log(`[LOG ${new Date().toLocaleTimeString()}] 1. Verificando permissão de localização...`);

    // Fallback para navegadores que não suportam a API de Permissões
    if (!navigator.permissions?.query) {
      this.getUserLocation();
      return;
    }

    const result = await navigator.permissions.query({ name: 'geolocation' });

    if (result.state === 'granted') {
      console.log(`[LOG ${new Date().toLocaleTimeString()}] 1.1. ✅ Permissão já concedida.`);
      this.getUserLocation();
    } else if (result.state === 'prompt') {
      console.log(`[LOG ${new Date().toLocaleTimeString()}] 1.1. ❔ Permissão necessária. Exibindo pré-alerta.`);

      const dialogRef = this.dialog.open<PermissionDialogComponent, PermissionDialogData, boolean>(PermissionDialogComponent, {
        data: {
          icon: 'location_on',
          title: 'Permitir sua localização?',
          content: 'Para encontrar pão quentinho perto de você, precisamos da sua localização.',
          confirmButton: 'Permitir',
          cancelButton: 'Agora não'
        },
        disableClose: true // Impede que o usuário feche clicando fora
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // Usuário clicou em "Permitir"
          this.habilitarNotificacoesParaLojista();
          this.getUserLocation();
        } else {
          // Usuário clicou em "Agora não" ou fechou o diálogo
          this.location$.next({ lat: -23.55052, lng: -46.633308 }); // Fallback para SP
        }
      });
    } else if (result.state === 'denied') {
      console.log(`[LOG ${new Date().toLocaleTimeString()}] 1.1. ❌ Permissão negada.`);
      this.getUserLocation();
    }
  }

  private getUserLocation(): void {
    console.log(`[LOG ${new Date().toLocaleTimeString()}] 2. Solicitando localização do navegador...`);

    if ('geolocation' in navigator) {
      // Para de monitorar a localização anterior, se houver.
      if (this.locationWatchId) {
        navigator.geolocation.clearWatch(this.locationWatchId);
      }

      this.locationWatchId = navigator.geolocation.watchPosition(
        ({ coords }) => {
          console.log(`[LOG ${new Date().toLocaleTimeString()}] 3. ✅ Localização recebida do navegador:`, { lat: coords.latitude, lng: coords.longitude });
          this.location$.next({ lat: coords.latitude, lng: coords.longitude });
        },
        (error) => {
          console.error(`[LOG ${new Date().toLocaleTimeString()}] 3. ❌ Erro ao obter localização:`, error.message);

          if (error.code === error.PERMISSION_DENIED) {
            const snackBarRef = this._snackBar.open('Sua localização está bloqueada. Que tal habilitá-la para encontrarmos pão quentinho por perto?', 'Como?', {
              duration: 10000,
              panelClass: ['pao-quentinho-snackbar']
            });
            snackBarRef.onAction().subscribe(() => {
              const isPWA = window.matchMedia('(display-mode: standalone)').matches;
              const instruction = isPWA
                ? 'Vá nas informações do app, entre em "Permissões" e habilite a Localização.'
                : 'Clique no cadeado ao lado do endereço do site e altere a permissão de Localização para "Permitir".';
              this._snackBar.open(instruction, 'Entendi', { duration: 15000, panelClass: ['pao-quentinho-snackbar'] });
            });
          }

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

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: any) {
    // Previne que o mini-infobar do Chrome apareça em mobile.
    event.preventDefault();
    this.installPrompt = event;
    this.showInstallBanner = true;
  }

  ngAfterViewInit(): void {
    // Inicializa o mapa com uma visão padrão para evitar "tela branca"
    this.inicializarMapa(-14.235, -51.925, 4); // Centro do Brasil, zoom afastado
    this.solicitarPermissoesIniciais();
    this.ouvirMudancasDeAutenticacao();
    this.bottomSheetEl = this._elementRef.nativeElement.querySelector('#bottomSheet');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Remove a classe do body para reabilitar o scroll em outras páginas.
    if (this.locationWatchId) {
      navigator.geolocation.clearWatch(this.locationWatchId);
    }
    this._elementRef.nativeElement.ownerDocument.body.classList.remove('no-scroll');

  }

  buscarEndereco(): void {
    const query = this.searchControl.value;
    if (!query || !this.map) {
      return;
    }

    this.isLoading = true;
    const cepPattern = /^\d{5}-?\d{3}$/;
    const queryLimpo = query.replace('-', '');

    const busca$ = cepPattern.test(queryLimpo)
      ? this.estabelecimentoService.getEnderecoPorCep(queryLimpo).pipe(
          switchMap(dadosEndereco => {
            if (dadosEndereco.erro) {
              throw new Error('CEP não encontrado.');
            }
            const enderecoCompleto = `${dadosEndereco.logradouro}, ${dadosEndereco.localidade}, ${dadosEndereco.uf}`;
            return this.estabelecimentoService.getCoordenadasPorEndereco(enderecoCompleto);
          })
        )
      : this.estabelecimentoService.getCoordenadasPorEndereco(query);

    busca$.pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (dadosCoordenadas) => {
        if (dadosCoordenadas && dadosCoordenadas.length > 0) {
          const lat = parseFloat(dadosCoordenadas[0].lat);
          const lng = parseFloat(dadosCoordenadas[0].lon);
          this.map?.flyTo([lat, lng], 15);
          // Opcional: mover o marcador do usuário para o local pesquisado
          this.isLocationOverridden = true; // Impede a centralização automática
          this.location$.next({ lat, lng });
        } else {
          this._snackBar.open('Endereço não encontrado.', 'Fechar', { duration: 3000 });
        }
      },
      error: (err) => {
        this._snackBar.open(err.message || 'Erro ao buscar endereço.', 'Fechar', { duration: 3000 });
      }
    });
  }



  private solicitarPermissoesIniciais(): void {
    this.solicitarPermissaoDeLocalizacao().then(() => this.initializeDataFlow());
  }

  private initializeDataFlow(): void {
    console.log(`[LOG ${new Date().toLocaleTimeString()}] 4. Iniciando fluxo de dados com a localização...`);
    const estabelecimentos$ = this.location$.pipe(
      filter((loc): loc is { lat: number; lng: number } => loc !== null),
      tap(loc => console.log(`[LOG ${new Date().toLocaleTimeString()}] 4. Localização válida recebida. Disparando chamada para API de estabelecimentos...`)),
      switchMap(loc =>
        this.estabelecimentoService.getEstabelecimentosProximos(loc.lat, loc.lng).pipe(map(response => response.body ?? [] as Estabelecimento[]))
      ),
      tap(estabelecimentos => {
        this.todosEstabelecimentos = estabelecimentos;
        this.ajustarRaioInicial();
        this.carregarEstabelecimentos();
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

    this.location$.pipe(
      filter((loc): loc is { lat: number; lng: number } => loc !== null),
      tap((loc) => {
        if (this.isLoading && !this.userMarker) {
          this.inicializarMarcadorUsuario(loc.lat, loc.lng);
          this.isLoading = false;
        }
        this.atualizarLocalizacaoMapa();
      }),
    ).subscribe(loc => {
    });
  }

  private ouvirMudancasDeAutenticacao(): void {
    this.authService.authState$
      .pipe(
        filter(isLoggedIn => isLoggedIn && this.authService.getUserRole() === 'lojista'),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        console.log('[AUTH-CHANGE] Lojista logado. Verificando permissões de notificação...');
        this.verificarEAtivarNotificacoesLojista();
      });
  }

  private verificarEAtivarNotificacoesLojista(): void {
    if (!this.swPush.isEnabled) return;

    navigator.permissions.query({ name: 'push' }).then(permissionStatus => {
      if (permissionStatus.state === 'prompt') {
        this.habilitarNotificacoesParaLojista();
      }
    });
  }

  /**
   * Habilita as notificações para o lojista logado, registrando seu dispositivo
   * para receber alertas (ex: novo seguidor).
   */
  private habilitarNotificacoesParaLojista(): void {
    this.notificationService.solicitarPermissaoDeNotificacao(() => {
      this.notificationService.getVapidPublicKey().pipe(
        switchMap(vapidPublicKey => this.swPush.requestSubscription({ serverPublicKey: vapidPublicKey })),
        switchMap(sub => this.notificationService.addPushSubscriber(sub, -1)), // -1 indica inscrição de lojista
        take(1) // Garante que a operação execute apenas uma vez
      ).subscribe({
        next: () => this._snackBar.open('Notificações habilitadas para este dispositivo!', 'Ok', { duration: 4000 }),
        error: (err) => this._snackBar.open('Não foi possível habilitar as notificações para o lojista.', 'Fechar', { duration: 5000 })
      });
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

    this.map.on('click', () => {
      if (this.isListOpen) {
        this._ngZone.run(() => {
          this.isListOpen = false;
        });
      }
    });
  }

  centralizarNoUsuario(): void {
    this.getUserLocation(); // Força a busca pela localização mais recente
    this.location$.pipe(
      filter((loc): loc is { lat: number; lng: number } => loc !== null),
      take(1) // Pega apenas a próxima localização emitida para evitar recentralizações indesejadas
    ).subscribe(loc => {
      if (this.map) this.map.flyTo([loc.lat, loc.lng], this.calculateZoomLevel(this.raio));
      this.isLocationOverridden = false; // Permite que a localização volte a ser atualizada
    });
  }

  private inicializarMarcadorUsuario(latitude: number, longitude: number): void {
    if (!this.map) return;

    this.userMarker = L.marker([latitude, longitude], {
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

    this.circle = L.circle([latitude, longitude], {
      color: '#c299fc',
      fillColor: '#f7c7ce',
      fillOpacity: 0.35,
      radius: this.raio
    }).addTo(this.map);

    const zoomLevel = this.calculateZoomLevel(this.raio);
    this.map.setView([latitude, longitude], zoomLevel);
  }

  private atualizarLocalizacaoMapa(): void {
    const loc = this.location$.value;
    if (!this.map || !loc || !this.userMarker || !this.circle) return;
    const newLatLng = new L.LatLng(loc.lat, loc.lng);

    // Atualiza a posição do marcador e do círculo sem mover o mapa
    this.userMarker.setLatLng(newLatLng);
    this.circle.setLatLng(newLatLng);

    // Se a localização não foi sobrescrita por uma busca, centraliza suavemente.
    if (!this.isLocationOverridden && this.map ) {
      const zoomLevel = this.calculateZoomLevel(this.raio);
      this.map.setView(newLatLng, zoomLevel, { animate: true});
    }
  }

  private carregarEstabelecimentos(): void {
    if (!this.map || !this.location$.value) return;

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

    this.definirRaio(raioEncontrado);
  }

  alternarLista(): void {
    this.isListOpen = !this.isListOpen;
  }

  selecionarEstabelecimento(est: Estabelecimento): void {
    if (this.selectedEstabelecimento?.id === est.id && this.selectedEstabelecimento !== null) {
      this.selectedEstabelecimento = null;
      // Garante que a UI processe a remoção antes de re-adicionar
      setTimeout(() => this._ngZone.run(() => this.selectedEstabelecimento = est), 10);
      return;
    }
    this.selectedEstabelecimento = est;
    this.isListOpen = false;

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
    this.installPrompt.prompt();
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

    if (this.map) {
      this.map.scrollWheelZoom.disable();
      this.map.touchZoom.disable();
      this.map.doubleClickZoom.disable();
      this.map.scrollWheelZoom.disable();
    }
  }

  iniciarNavegacao(est: Estabelecimento, event: MouseEvent): void {
    event.stopPropagation(); // Impede que o clique se propague para outros elementos

    this.fecharDetalhe(false);

    const loc = this.location$.value;
    if (!this.map || !loc) return;

    if (this.routingControl) {
      this.routingControl.remove();
    }

    this.routingControl = L.Routing.control({
      routeWhileDragging: true,
      show: false,
      addWaypoints: false,
      fitSelectedRoutes: false,
      lineOptions: {
        styles: [{ color: '#6200ee', opacity: 0.8, weight: 6 }]
      } as any,
      plan: L.Routing.plan([
        L.latLng(loc.lat, loc.lng),
        L.latLng(est.latitude, est.longitude)
      ], {
        createMarker: function () { return false; }
      })
    }).addTo(this.map);

    const bounds = L.latLngBounds([
      L.latLng(loc.lat, loc.lng),
      L.latLng(est.latitude, est.longitude)
    ]);

    this.map.fitBounds(bounds, { padding: [50, 50] });

    // Habilita o zoom durante a navegação
    if (this.map) {
      this.map.scrollWheelZoom.enable();
      this.map.touchZoom.enable();
      this.map.doubleClickZoom.enable();
    }
  }

  /**
   * Lógica central para se inscrever em um estabelecimento.
   * Pede a chave VAPID, solicita a inscrição no navegador e envia para o backend.
   * @param estabelecimentoId O ID do estabelecimento para seguir.
   */
  public async subscribeToNotifications(estabelecimentoId: number): Promise<PushSubscription> {
    if (!this.swPush.isEnabled) {
      this._snackBar.open('As notificações push não são suportadas ou estão desabilitadas.', 'Fechar', {
        duration: 5000,
        panelClass: ['pao-quentinho-snackbar']
      });
      throw new Error('Push notifications are not enabled.');
    }

    try {
      const vapidPublicKey = await firstValueFrom(this.notificationService.getVapidPublicKey());

      if (!vapidPublicKey) {
        throw new Error('Chave VAPID pública não recebida do servidor.');
      }

      const sub = await this.swPush.requestSubscription({
        serverPublicKey: vapidPublicKey,
      });

      await firstValueFrom(this.notificationService.addPushSubscriber(sub, estabelecimentoId));

      return sub;
    } catch (err) {
      console.error(`Não foi possível se inscrever para notificações (ID: ${estabelecimentoId})`, err);
      // Lançamos o erro para que o chamador saiba que falhou.
      throw err;
    }
  }

  async seguirEstabelecimento(est: Estabelecimento, event: MouseEvent): Promise<void> {
    event.stopPropagation(); // Impede que o clique feche o card

    this.notificationService.solicitarPermissaoDeNotificacao(() => this.subscribeToNotifications(est.id).then(() => {
      this._snackBar.open(`Inscrição realizada com sucesso para a ${est.nome}!`, 'Ok', { duration: 3000, panelClass: ['pao-quentinho-snackbar'] });
    }));
  }

  async compartilharEstabelecimento(est: Estabelecimento | null, event: MouseEvent): Promise<void> {
    event.stopPropagation(); // Impede que o clique feche o card

    if (!est) return;

    const shareData = {
      title: `Pão Quentinho: ${est.nome}`,
      text: `Confira este lugar que encontrei no Pão Quentinho! ${est.nome}`,
      url: `https://pao-quentinho-production.up.railway.app/estabelecimento/${est.id}`
    };

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
      // Fallback: Copiar para a área de transferência
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
      const zoomLevel = this.calculateZoomLevel(this.raio);
      this.filtrarEstabelecimentos();
      this.map.flyTo(new L.LatLng(loc.lat, loc.lng), zoomLevel);
    } else {
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
    const sheetContent = (event.currentTarget as HTMLElement).querySelector('.sheet-content');
    if (sheetContent && sheetContent.scrollTop > 0) {
      this.isDragging = false;
      return;
    }

    this.isDragging = true;
    this.touchStartY = event.touches[0].clientY;
    this.bottomSheetEl?.classList.add('dragging');
  }

  protected onTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return;

    const sheetEl = this.bottomSheetEl;
    if (!sheetEl) return;

    const touchMoveY = event.touches[0].clientY;
    const deltaY = touchMoveY - this.touchStartY;

    const startY = this.isListOpen ? 0 : sheetEl.clientHeight - BOTTOM_SHEET_PEEK_HEIGHT;
    const newTranslateY = startY + deltaY;
    const constrainedY = Math.max(0, newTranslateY);

    sheetEl.style.transform = `translateY(${constrainedY}px)`;
  }

  protected onTouchEnd(event: TouchEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    const sheetEl = this.bottomSheetEl;
    if (!sheetEl) return;

    sheetEl.classList.remove('dragging');
    sheetEl.style.transform = '';

    const touchEndY = event.changedTouches[0].clientY;
    const deltaY = touchEndY - this.touchStartY;

    if (deltaY < -SWIPE_THRESHOLD) this.isListOpen = true; // Deslizou para cima
    if (deltaY > SWIPE_THRESHOLD) this.isListOpen = false; // Deslizou para baixo
  }

  private calculateZoomLevel(radiusInMeters: number): number {
    const zoomLevels = { 500: 16, 1000: 15, 5000: 13 };
    return zoomLevels[radiusInMeters as keyof typeof zoomLevels] || 12;
  }

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
