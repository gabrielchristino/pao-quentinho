import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthDialogComponent } from '../auth-dialog/auth-dialog.component';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);
  const dialog = inject(MatDialog);

  if (authService.isLoggedIn()) {
    return true; // Usuário está logado, permite o acesso.
  }

  // Usuário não está logado, abre o modal de login.
  snackBar.open('Você precisa estar logado para acessar esta página.', 'Ok', { duration: 3000 });
  const dialogRef = dialog.open(AuthDialogComponent, {
    width: '450px',
    disableClose: true // Impede que o usuário feche o modal sem logar.
  });

  // Retorna um Observable que só resolve quando o modal é fechado.
  return dialogRef.afterClosed().pipe(
    map(result => {
      if (result === true) { // Login bem-sucedido
        // Se o destino era a página de cadastro, redireciona para a de gerenciamento.
        if (state.url.includes('/cadastrar-estabelecimento')) {
          router.navigate(['/meus-estabelecimentos']);
          return false; // Bloqueia a navegação original para '/cadastrar-estabelecimento'
        }
        // Se o destino já era 'meus-estabelecimentos', permite a navegação.
        return true;
      } else { // Login cancelado
        // Se o usuário cancelar, redireciona para a página inicial.
        router.navigate(['/']);
        return false;
      }
    })
  );
};