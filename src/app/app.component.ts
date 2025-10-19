import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';
import { SwPush } from '@angular/service-worker';

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

  title = 'pao-quentinho';

  constructor() {
    this.handleNotificationClicks();
  }

  private handleNotificationClicks(): void {
    // Este código só é executado se o app já estiver aberto.
    this.swPush.notificationClicks.subscribe(event => {
      console.log('Notificação clicada com o app aberto:', event);
      const url = event.notification.data?.url;
      if (url) {
        // Extrai o caminho da URL (ex: /estabelecimento/5) e navega
        const path = new URL(url).pathname;
        this.router.navigateByUrl(path);
      }
    });
  }
}
