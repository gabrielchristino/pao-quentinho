import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './header.component';
import { SwPush } from '@angular/service-worker';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private swPush = inject(SwPush);
  private router = inject(Router);
  showHeader = true;

  title = 'pao-quentinho';

  constructor() {
    this.handleNotificationClicks();

    // Ouve as mudanças de rota para decidir se o header deve ser exibido
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Esconde o header apenas na rota raiz (Mapa).
      // A rota '/estabelecimento/:id' redireciona para '/', então também cairá aqui.
      const urlWithoutParams = event.urlAfterRedirects.split('?')[0];
      this.showHeader = urlWithoutParams !== '/';
    });
  }

  private handleNotificationClicks(): void {
    // Este código só é executado se o app já estiver aberto.
    this.swPush.notificationClicks.subscribe(event => {
      console.log('Notificação clicada com o app aberto:', event);
      
      // Lógica robusta para extrair a URL da estrutura onActionClick
      const action = event.action;
      const data = event.notification.data;
      let url: string | undefined;

      if (data?.onActionClick) {
        // 1. Tenta pegar a URL da ação específica (ex: 'reserve')
        if (action && data.onActionClick[action]) {
          url = data.onActionClick[action].url;
        } 
        // 2. Se não, pega a URL padrão (clique no corpo)
        else if (data.onActionClick['default']) {
          url = data.onActionClick['default'].url;
        }
      }

      if (url) {
        // O navigateByUrl lida bem com rotas absolutas e query params (ex: /?id=1)
        // Garante que a URL comece com / para ser tratada como absoluta pelo Router
        if (!url.startsWith('/')) {
          url = '/' + url;
        }
        this.router.navigateByUrl(url);
      }
    });
  }
}
