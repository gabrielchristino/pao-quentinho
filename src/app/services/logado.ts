import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guarda de rota que permite o acesso apenas para usuários logados.
 * Se o usuário não estiver logado, ele é redirecionado para a página inicial.
 */
export const logadoGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verifica se o usuário está logado
  if (authService.isLoggedIn() ) {
    return true; // Permite o acesso à rota
  }

  // Se não estiver logado, redireciona para a página inicial e impede o acesso.
  return router.createUrlTree(['/']);
};