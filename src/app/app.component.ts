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
    this.swPush.notificationClicks.subscribe(event => {
      console.log('Notification clicked:', event);
      const url = event.notification.data?.url;
      if (url) {
        // Extrai o caminho da URL para navegar dentro do app sem recarregar a página
        const path = new URL(url).pathname.replace('/pao-quentinho', ''); // Remove o base href se estiver presente
        this.router.navigateByUrl(path);
      }
    });
  }
}
