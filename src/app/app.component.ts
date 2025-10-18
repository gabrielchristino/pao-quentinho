import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';
import { SwPush } from '@angular/service-worker';
import { MapStateService } from './services/map-state.service';

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
  private mapStateService = inject(MapStateService);

  title = 'pao-quentinho';

  constructor() {
    this.handleNotificationClicks();
  }

  private handleNotificationClicks(): void {
    this.swPush.notificationClicks.subscribe(event => {
      console.log('Notification clicked:', event);
      const url = event.notification.data?.url;
      if (url) {
        // Extrai o ID do estabelecimento da URL
        const urlSegments = new URL(url).pathname.split('/');
        const establishmentId = Number(urlSegments.pop()); // Pega o último segmento (o ID)

        if (establishmentId) {
          // 1. Navega para a página principal (onde o mapa está)
          this.router.navigate(['/']).then(() => {
            // 2. Pede ao serviço para selecionar o estabelecimento
            this.mapStateService.selectEstablishment(establishmentId);
          });
        }
      }
    });
  }
}
