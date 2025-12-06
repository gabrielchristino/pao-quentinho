import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService, User } from './services/auth.service';
import { Observable } from 'rxjs';
import { filter, map, startWith, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule
  ], 
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  public authService = inject(AuthService);
  private router = inject(Router);
  private location = inject(Location);
  private activatedRoute = inject(ActivatedRoute);
  public dialog = inject(MatDialog);

  contactEmail: string = 'paoquentinho.sac@gmail.com';
  contactSubject: string = 'Ajuda com o aplicativo Pão Quentinho';
  pageTitle$: Observable<string>;
  currentUser$: Observable<User | null>; // Observable para os detalhes do usuário

  constructor() {
    this.pageTitle$ = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(this.router), // Emit initial value
      map(() => {
        let route: ActivatedRoute | null = this.activatedRoute;
        while (route?.firstChild) {
          route = route.firstChild;
        }
        return route?.snapshot.title || '';
      })
    );

    // Cria um observable para o usuário atual baseado no estado de autenticação.
    this.currentUser$ = this.authService.currentUser$;

    // Ouve o evento para abrir o modal de login
    this.authService.requestLogin$.subscribe(() => {
      // A lógica para abrir o modal de login do mapa foi movida para cá
      this.router.navigate(['/'], { queryParams: { action: 'login' } });
    });
  }

  get isLojista(): boolean {
    return this.authService.getUserRole() === 'lojista';
  }

  abrirLogin(): void {
    // Navega para o mapa e aciona o tour de login
    this.authService.requestLogin();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  getMailtoLink(): string {
    const subjectEncoded = encodeURIComponent(this.contactSubject);
    return `mailto:${this.contactEmail}?subject=${subjectEncoded}`;
  }

  abrirLinkDeAjuda(): void {
    window.location.href = this.getMailtoLink();
  }

  navigateTo(route: string[]): void {
    this.router.navigate(route);
  }

  goBack(): void {
    this.location.back();
  }
}