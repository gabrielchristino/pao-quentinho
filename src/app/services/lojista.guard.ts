import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guarda de rota que permite o acesso apenas para usuários com o perfil 'lojista'.
 * Se o usuário não for um lojista, ele é redirecionado para a página inicial.
 */
export const lojistaGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verifica se o usuário está logado e se seu perfil é 'lojista'
  if (authService.isLoggedIn() && authService.getUserRole() === 'lojista') {
    return true; // Permite o acesso à rota
  }

  // Se não for lojista, redireciona para a página inicial e impede o acesso.
  return router.createUrlTree(['/']);
};