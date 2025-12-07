import { CommonModule, Location } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, NgZone, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SwPush } from '@angular/service-worker';
import L from 'leaflet';
import 'leaflet-routing-machine';
import ptBR from '../../../node_modules/osrm-text-instructions/languages/translations/pt-BR.json';
import { BehaviorSubject, combineLatest, debounceTime, filter, finalize, firstValueFrom, map, of, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
import { Estabelecimento } from '../estabelecimento.model';
import { EstabelecimentosService } from '../services/estabelecimentos.service';
import { NotificationService } from '../services/notification.service';

import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
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

import { environment } from '../../environments/environment';

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
    MatTabsModule,
    MatCheckboxModule,

  ],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss',
  host: {
    '[style.display]': "'block'",
    '[style.height]': "'100%'",
    '[style.overflow]': "'hidden'"
  }
})
export class MapaComponent implements AfterViewInit, OnInit {
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
  private destroy$ = new Subject<void>();
  tourStep: 'welcome' | 'location' | 'notification' | 'install' | 'login' | null = null;
  isLoading = true;
  isLoggingIn = false;
  isRegistering = false;
  hideLoginPassword = true;
  isRequestingLocation = false;
  isRequestingNotification = false;
  hideRegisterPassword = true;
  private isLocationOverridden = false; // Flag para controlar a centralização
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  public loginErrorMessage: string | null = null; // Nova propriedade para mensagem de erro de login
  public registerErrorMessage: string | null = null; // Nova propriedade para mensagem de erro de cadastro
  public activeTabIndex = 0;
  contactEmail: string = 'paoquentinho.sac@gmail.com';
  contactSubject: string = 'Ajuda com o aplicativo Pão Quentinho';

  get isLojista(): boolean {
    return this.authService.getUserRole() === 'lojista';
  }


  constructor(
    private estabelecimentoService: EstabelecimentosService,
    private _ngZone: NgZone,
    private _elementRef: ElementRef<HTMLElement>,
    private swPush: SwPush,
    private _snackBar: MatSnackBar,
    private notificationService: NotificationService,
    private mapStateService: MapStateService,
    public dialog: MatDialog,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute, // Injeta ActivatedRoute
    private fb: FormBuilder
    , private location: Location) {
    // Adiciona a classe ao body para desabilitar o scroll global
    // quando este componente está ativo.
    this._elementRef.nativeElement.ownerDocument.body.classList.add('no-scroll');
  }
  ngAfterViewInit(): void {
    // Adia a inicialização do mapa para depois que o navegador renderizar a página.
    // Isso melhora drasticamente o LCP e a pontuação de Performance.
    setTimeout(() => {
      this.inicializarMapa(-14.235, -51.925, 4);
      if (!this.tourStep) { // Só solicita permissões se o tour não estiver ativo
        this.requestUserLocation();
        this.initializeDataFlow();
      }
      this.ouvirMudancasDeAutenticacao();
    }, 0);
    this.bottomSheetEl = this._elementRef.nativeElement.querySelector('#bottomSheet');
    this.handleRouteActions();
  }
  ngOnInit(): void {
    const isFirstVisit = !localStorage.getItem('hasVisited');
    if (isFirstVisit) {
      this.tourStep = 'welcome';
    }
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/) // Exige pelo menos uma letra e um número
      ]],
      isLojista: [false]
    });


  }

  /**
   * Orquestra a obtenção da localização do usuário, lidando com permissões,
   * fallbacks e a interface do tour.
   */
  private async requestUserLocation(): Promise<void> {
    if (localStorage.getItem('locationPermissionSkipped') === 'true') {
      this.location$.next({ lat: -23.55052, lng: -46.633308 });
      this.isLocationOverridden = true;
      return;
    }

    if (navigator.permissions?.query) {
      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
      if (permissionStatus.state === 'prompt' && !this.tourStep) {
        this.tourStep = 'location';
        return;
      }
    }

    const getPosition = (options: PositionOptions): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));

    try {
      const { coords } = await getPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
      this.location$.next({ lat: coords.latitude, lng: coords.longitude });
    } catch (error) {
      if ((error as GeolocationPositionError).code === (error as GeolocationPositionError).TIMEOUT) {
        try {
          const { coords } = await getPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
          this.location$.next({ lat: coords.latitude, lng: coords.longitude });
        } catch (lowAccuracyError) {
          this.location$.next({ lat: -23.55052, lng: -46.633308 }); // Fallback final
        }
      } else {
        if ((error as GeolocationPositionError).code === (error as GeolocationPositionError).PERMISSION_DENIED) {
          const snackBarRef = this._snackBar.open('Sua localização está bloqueada. Que tal habilitá-la para encontrarmos pão quentinho por perto?', 'Como?', {
            duration: 10000,
            panelClass: ['pao-quentinho-snackbar']
          });
          snackBarRef.onAction().subscribe(() => {
            const instruction = 'Clique no cadeado ao lado do endereço do site e altere a permissão de Localização para "Permitir".';
            this._snackBar.open(instruction, 'Entendi', { duration: 15000, panelClass: ['pao-quentinho-snackbar'] });
          });
        }
        this.location$.next({ lat: -23.55052, lng: -46.633308 }); // Fallback para outros erros
      }
    }
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: any) {
    // Previne que o mini-infobar do Chrome apareça em mobile.
    event.preventDefault();
    this.installPrompt = event;
    this.showInstallBanner = true;
  }

  private handleRouteActions(): void {
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const establishmentIdToOpen = params['open_establishment_id'];
      const action = params['action'];

      if (establishmentIdToOpen) {
        this.mapStateService.selectEstablishment(Number(establishmentIdToOpen));
        // Limpa o query param da URL após o uso
        this.router.navigate([], { queryParams: { open_establishment_id: null }, queryParamsHandling: 'merge', replaceUrl: true });
      }

      if (action === 'login') {
        // Garante que a ação de login não interfira com o tour de primeira visita
        if (!localStorage.getItem('hasVisited')) {
          localStorage.setItem('hasVisited', 'true');
        }
        this.tourStep = 'login';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Remove a classe do body para reabilitar o scroll em outras páginas.
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
          // Move o marcador do usuário para o local pesquisado
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

  private initializeDataFlow(): void {
    const estabelecimentos$ = this.location$.pipe(
      debounceTime(50), // Evita re-execuções rápidas e desnecessárias
      filter((loc): loc is { lat: number; lng: number } => loc !== null),
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
        // Garante a inicialização do marcador e a centralização do mapa
        // tanto no carregamento inicial quanto ao final do tour,
        // quando o marcador ainda não foi criado.
        if (!this.userMarker) {
          this.inicializarMarcadorUsuario(loc.lat, loc.lng);
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
        this.verificarEAtivarNotificacoesLojista();
      });
  }

  private verificarEAtivarNotificacoesLojista(): void {
    if (!this.swPush.isEnabled) return;

    navigator.permissions.query({ name: 'push', userVisibleOnly: true } as any).then(permissionStatus => {
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
    this.disableMapNavigation();

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
    // Se o usuário pulou a permissão anteriormente, re-exibe o tour de localização.
    if (localStorage.getItem('locationPermissionSkipped') === 'true') {
      this.tourStep = 'location';
    } else {
      // Comportamento padrão: busca a localização e centraliza o mapa.
      this.requestUserLocation();
      this.location$.pipe(
        filter((loc): loc is { lat: number; lng: number } => loc !== null),
        take(1) // Pega apenas a próxima localização emitida para evitar recentralizações indesejadas
      ).subscribe(loc => {
        if (this.map && !this.selectedEstabelecimento) this.map.flyTo([loc.lat, loc.lng], this.calculateZoomLevel(this.raio));
        this.isLocationOverridden = false; // Permite que a localização volte a ser atualizada
      });
    }
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

    // Garante que a tela de carregamento seja removida após a inicialização do marcador.
    this.isLoading = false;
  }

  private atualizarLocalizacaoMapa(): void {
    const loc = this.location$.value;
    if (!this.map || !loc || !this.userMarker || !this.circle) return;
    const newLatLng = new L.LatLng(loc.lat, loc.lng);

    // Atualiza a posição do marcador e do círculo sem mover o mapa
    this.userMarker.setLatLng(newLatLng);
    this.circle.setLatLng(newLatLng);
    if (!this.isLocationOverridden && this.map && !this.selectedEstabelecimento) {
      const zoomLevel = this.calculateZoomLevel(this.raio);
      this.map.setView(newLatLng, zoomLevel, { animate: true });
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
    // Se o estabelecimento já está selecionado, não faz nada para evitar o pisca-pisca.
    if (this.selectedEstabelecimento?.id === est.id) {
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

  async instalarPWA(): Promise<void> {
    if (!this.installPrompt) {
      return;
    }
    this.installPrompt.prompt(); // Mostra o prompt de instalação do navegador
    await this.installPrompt.userChoice; // Aguarda a escolha do usuário
    this.installPrompt = null; // Limpa o prompt
    this.finalizarTour(); // Finaliza o tour para remover o overlay
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

    this.disableMapNavigation();
    // Limpa o estado de seleção para evitar que o popup reabra.
    this.mapStateService.clearSelection();

    // Limpa a URL, removendo o ID do estabelecimento.
    this.router.navigate(['/'], { replaceUrl: true });
  }

  iniciarNavegacao(est: Estabelecimento, event: MouseEvent): void {
    event.stopPropagation(); // Impede que o clique se propague para outros elementos

    this.fecharDetalhe(false);

    this.selectedEstabelecimento = est;

    const loc = this.location$.value;
    if (!this.map || !loc) return;

    if (this.routingControl) {
      this.routingControl.remove();
    }

    this.routingControl = L.Routing.control({
      routeWhileDragging: true,
      show: false,
      router: (L.Routing as any).osrmv1({
        language: 'pt-BR',
        textInstructions: new (L.Routing as any).Localization({ 'pt-BR': ptBR })
      } as any),
      addWaypoints: false,
      fitSelectedRoutes: false,
      lineOptions: {
        styles: [{ color: '#d96c2c', opacity: 0.8, weight: 6 }]
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
    this.enableMapNavigation();
  }

  /**
   * Navega para a visualização anterior.
   */
  voltar(): void {
    this.fecharDetalhe();
    this.location.back();
  }

  /**
   * Abre o aplicativo de GPS padrão do usuário com o destino pré-selecionado.
   */
  abrirNoGPS(): void {
    if (!this.selectedEstabelecimento) return;

    const lat = this.selectedEstabelecimento.latitude;
    const lng = this.selectedEstabelecimento.longitude;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
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
    event.stopPropagation();

    // Se o usuário pulou a permissão anteriormente, re-exibe o tour de notificação.
    if (localStorage.getItem('notificationPermissionSkipped') === 'true') {
      this.selectedEstabelecimento = est; // Armazena o estabelecimento que o usuário quer seguir
      this.tourStep = 'notification';
    } else {
      // Comportamento padrão: solicita a permissão e se inscreve.
      this.notificationService.solicitarPermissaoDeNotificacao(() => {
        this.subscribeToNotifications(est.id).then(() => {
          this._snackBar.open(`Inscrição realizada com sucesso para a ${est.nome}!`, 'Ok', { duration: 3000, panelClass: ['pao-quentinho-snackbar'] });
        });
      });
    }
  }

  async compartilharEstabelecimento(event: MouseEvent): Promise<void> {
    event.stopPropagation(); // Impede que o clique feche o card

    if (!this.selectedEstabelecimento) return;

    const shareData = {
      title: `Pão Quentinho: ${this.selectedEstabelecimento.nome}`,
      text: `Confira este lugar que encontrei no Pão Quentinho!\n ${this.selectedEstabelecimento.nome}`,
      url: `${environment.frontendUrl}/estabelecimento/${this.selectedEstabelecimento.id}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
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
      // Só recentraliza no usuário se nenhum estabelecimento estiver selecionado.
      if (!this.selectedEstabelecimento) {
        this.map.flyTo(new L.LatLng(loc.lat, loc.lng), zoomLevel);
      }
      this.filtrarEstabelecimentos();
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

  /**
  * Lida com a ação de reserva de um estabelecimento, chamando o backend.
  * @param establishmentId O ID do estabelecimento a ser reservado.
  */
  private handleReserveAction(establishmentId: number): void {
    this.estabelecimentoService.reserveEstablishment(establishmentId).pipe(
      take(1) // Pega apenas uma emissão e completa
    ).subscribe({
      next: () => {
        this._snackBar.open('Sua solicitação de reserva foi enviada ao estabelecimento!', 'Ok', {
          duration: 5000,
          panelClass: ['pao-quentinho-snackbar']
        });
        // Remove o parâmetro 'action=reserve' da URL para evitar re-execuções
        this.router.navigate([], { queryParams: { action: null }, queryParamsHandling: 'merge', replaceUrl: true });
      },
      error: (err) => {
        console.error('Erro ao enviar solicitação de reserva:', err);
        this._snackBar.open('Não foi possível enviar sua solicitação de reserva. Tente novamente.', 'Fechar', { duration: 5000, panelClass: ['pao-quentinho-snackbar'] });
      }
    });
  }

  getHorarioHoje(est: Estabelecimento | null): string | null {
    if (!est) return null;

    const hoje = new Date().getDay(); // Domingo = 0, Segunda = 1, etc.

    // Lógica para o novo formato (array)
    if (Array.isArray(est.horarioAbertura) && Array.isArray(est.horarioFechamento)) {
      const abertura = est.horarioAbertura[hoje];
      const fechamento = est.horarioFechamento[hoje];
      return (abertura && fechamento) ? `Aberto hoje: ${abertura} às ${fechamento}` : 'Fechado hoje';
    }

    // Lógica de fallback para o formato antigo (string)
    if (typeof est.horarioAbertura === 'string' && typeof est.horarioFechamento === 'string') {
      return `${est.horarioAbertura} às ${est.horarioFechamento}`;
    }
    return 'Horário não informado';
  }

  async solicitarPermissaoLocalizacao(): Promise<void> {
    this.isRequestingLocation = true;
    localStorage.removeItem('locationPermissionSkipped');
    this.isLocationOverridden = false;
    try {
      await this.requestUserLocation();
    } finally {
      this.isRequestingLocation = false;
      this.avancarTour();
    }
  }

  solicitarPermissaoNotificacao(): void {
    this.isRequestingNotification = true;
    localStorage.removeItem('notificationPermissionSkipped');

    const onGranted = () => {
      this.avancarTour();
      if (this.selectedEstabelecimento) {
        this.subscribeToNotifications(this.selectedEstabelecimento.id).then(() => {
          this._snackBar.open(`Inscrição realizada com sucesso para a ${this.selectedEstabelecimento!.nome}!`, 'Ok', { duration: 3000, panelClass: ['pao-quentinho-snackbar'] });
          this.selectedEstabelecimento = null; // Limpa a seleção pendente
        });
      }
      this.isRequestingNotification = false;
    };

    const onDeniedOrDismissed = () => {
      this.selectedEstabelecimento = null; // Limpa a inscrição pendente se o usuário negar
    };

    // O serviço de notificação agora lida com o prompt do navegador
    // e chama o callback apropriado.
    this.notificationService.solicitarPermissaoDeNotificacao(onGranted, onDeniedOrDismissed);
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;

    this.isLoggingIn = true;
    this.authService.login(this.loginForm.value).pipe(
      finalize(() => this.isLoggingIn = false)
    ).subscribe({
      next: (syncResponse) => {
        if (syncResponse?.syncedEstablishmentIds) {
          this.notificationService.triggerSubscriptionSync(syncResponse.syncedEstablishmentIds);
        }
        this.router.navigate(['/'], { replaceUrl: true });
        this.avancarTour(); // Avança para o próximo passo do tour (instalação)
      },
      error: (err) => {
        this.handleAuthError(err, 'login');
      }
    });
  }

  onRegister(): void {
    if (this.registerForm.invalid) return;

    this.isRegistering = true;
    this.authService.register(this.registerForm.value).pipe(
      finalize(() => this.isRegistering = false)
    ).subscribe({
      next: (syncResponse) => {
        this.router.navigate(['/'], { replaceUrl: true });
        this.avancarTour(); // Avança para o próximo passo do tour (instalação)
        const userRole = this.authService.getUserRole();
        if (userRole === 'lojista') {
          this.router.navigate(['/meus-estabelecimentos']);
        }
        if (syncResponse?.syncedEstablishmentIds) {
          this.notificationService.triggerSubscriptionSync(syncResponse.syncedEstablishmentIds);
        }
      },
      error: (err) => {
        this.handleAuthError(err, 'register');
      }
    });
  }
  private handleAuthError(err: any, type: 'login' | 'register'): void {
    let message: string;
    if (type === 'login') {
      message = err.status === 401 ? 'Credenciais inválidas.' : 'Erro ao fazer login.';
      this.loginErrorMessage = message;
    } else { // register
      message = err.status === 409 ? 'Este email já está em uso.' : 'Erro ao se cadastrar.';
      this.registerErrorMessage = message;
    }
    this._snackBar.open(message, 'Fechar', { duration: 3000 });
  }

  private enableMapNavigation(): void {
    if (!this.map) return;
    this.map.scrollWheelZoom.enable();
    this.map.touchZoom.enable();
    this.map.doubleClickZoom.enable();
  }

  /**
   * Navega para uma rota específica.
   * @param route A rota para a qual navegar.
   */
  navigateTo(route: string[]): void {
    this.router.navigate(route);
  }

  getMailtoLink(): string {
    const subjectEncoded = encodeURIComponent(this.contactSubject);
    return `mailto:${this.contactEmail}?subject=${subjectEncoded}`;
  }

  abrirLinkDeAjuda(): void {
    window.location.href = this.getMailtoLink();
  }

  avancarTour(skipped = false): void {
    if (this.tourStep === 'welcome') {
      this.tourStep = 'location';
    } else if (this.tourStep === 'location' && skipped) {
      // Se o usuário pular a etapa de localização, define uma localização padrão (São Paulo).
      localStorage.setItem('locationPermissionSkipped', 'true');
      this.location$.next({ lat: -23.55052, lng: -46.633308 });
      this.tourStep = 'notification';
    } else if (this.tourStep === 'location') { // Se não pulou, apenas avança
      this.tourStep = 'notification';
    } else if (this.tourStep === 'notification' && skipped) {
      localStorage.setItem('notificationPermissionSkipped', 'true'); // Marca como pulado
      this.tourStep = 'login';
    } else if (this.tourStep === 'notification') { // Avança da notificação para o login
      this.tourStep = 'login';
    } else if (this.tourStep === 'login' && skipped) {
      this.finalizarTour();
    } else if (this.tourStep === 'login') { // Avança do login para a instalação (ou finaliza)
      this.tourStep = this.installPrompt ? 'install' : null;
    } else if (this.tourStep === 'install') {
      this.finalizarTour();
    } else {
      this.finalizarTour();
    }
  }

  finalizarTour(): void {
    this.tourStep = null;
    localStorage.setItem('hasVisited', 'true');
    const userRole = this.authService.getUserRole();
    // Se o marcador do usuário ainda não foi criado (ex: pulou o tour),
    // inicializa o fluxo de dados para usar a localização padrão e carregar o mapa.
    if (!this.userMarker) {
      // Garante que o fluxo de dados só comece após a localização (real ou padrão) ser definida.
      this.location$.pipe(
        filter((loc): loc is { lat: number; lng: number } => loc !== null),
        take(1),
        takeUntil(this.destroy$)
      ).subscribe((loc) => {
        this.inicializarMarcadorUsuario(loc.lat, loc.lng);
        // Após o marcador inicial ser criado, iniciamos o fluxo para carregar estabelecimentos.
        this.initializeDataFlow();
      });
    }
    if (userRole === 'lojista') {
      this.router.navigate(['/meus-estabelecimentos']);
    }
  }

  private disableMapNavigation(): void {
    if (!this.map) return;
    this.map.scrollWheelZoom.disable();
    this.map.touchZoom.disable();
    this.map.doubleClickZoom.disable();
  }
}
