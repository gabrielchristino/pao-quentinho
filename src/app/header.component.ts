import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, MatToolbarModule, MatIconModule],
  template: `
    <mat-toolbar class="header">
      <a routerLink="/">
        <img src="assets/icons/icon-72x72.png" alt="Logo Pão Quentinho" class="header-logo">
        <span>Pão Quentinho</span>
      </a>
    </mat-toolbar>
  `,
  styles: [`
    /*
      :host é um seletor que mira o elemento hospedeiro do componente (<app-header>).
      Usá-lo garante que as regras de estilo sejam aplicadas de forma mais específica.
    */
    :host a {
      display: flex;
      align-items: center;
      text-decoration: none;
      color: inherit; /* Garante que a cor do texto seja a da toolbar, não a de um link */
    }

    .header {
      position: fixed; /* Mantém o cabeçalho fixo no topo */
      z-index: 1001; /* Garante que ele fique acima de outros elementos */
    }

    .header-logo {
      height: 40px;
      width: 40px;
      margin-right: 16px;
    }

    span {
      font-size: 1.25rem;
      font-weight: 500;
    }
  `]
})
export class HeaderComponent {}