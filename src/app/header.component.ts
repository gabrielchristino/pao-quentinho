import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="header">
      <a routerLink="/">
        <h1>Pão Quentinho</h1>
      </a>
    </header>
  `,
  styles: [`
    .header {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 60px;
      background-color: #ffc107; /* Amarelo, como na logo */
      color: #333;
      display: flex;
      align-items: center;
      padding: 0 20px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 1000;
    }
  `]
})
export class HeaderComponent {}