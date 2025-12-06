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
      // Esconde o header na rota do mapa ('/' ou '/estabelecimento/:id')
      this.showHeader = !(event.urlAfterRedirects === '/' || event.urlAfterRedirects.startsWith('/estabelecimento/'));
    });
  }

  private handleNotificationClicks(): void {
    // Este código só é executado se o app já estiver aberto.
    this.swPush.notificationClicks.subscribe(event => {
      console.log('Notificação clicada com o app aberto:', event);
      const url = event.notification.data?.url;
      if (url) {
        // Extrai o ID do estabelecimento da URL e navega para a raiz com o query param.
        const path = new URL(url).pathname;
        const establishmentId = path.split('/').pop();
        this.router.navigate(['/'], { queryParams: { open_establishment_id: establishmentId } });
      }
    });
  }
}
