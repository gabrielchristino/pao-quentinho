import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from './services/auth.service';
import { AuthDialogComponent } from './auth-dialog/auth-dialog.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  public authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  get isLojista(): boolean {
    return this.authService.getUserRole() === 'lojista';
  }

  abrirLogin(): void {
    this.dialog.open(AuthDialogComponent, {
      width: '450px'
    });
  }

  logout(): void {
    this.authService.logout();
    this.snackBar.open('Você saiu da sua conta.', 'Ok', { duration: 3000 });

    // Check if the user is on a protected route
    const isProtected = this.router.url.includes('/meus-estabelecimentos') || this.router.url.includes('/cadastrar-estabelecimento');

    if (isProtected) {
      // If on a protected route, open the login modal immediately.
      const dialogRef = this.dialog.open(AuthDialogComponent, {
        width: '450px',
        disableClose: true
      });

      dialogRef.afterClosed().subscribe(result => {
        // After the modal closes, decide where to go.
        this.router.navigate([result ? '/meus-estabelecimentos' : '/']);
      });
    } else {
      // If on a public page like the map, just stay there.
    }
  }
}