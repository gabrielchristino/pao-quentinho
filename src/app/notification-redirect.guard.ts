import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

/**
 * Um guard que intercepta a navegação vinda de um clique de notificação.
 * Ele cancela a navegação para /estabelecimento/:id e redireciona para a
 * página inicial (mapa) com um query param, que será lido pelo MapaComponent.
 */
export const notificationRedirectGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const establishmentId = route.paramMap.get('id');

  if (establishmentId) {
    // Redireciona para a raiz, passando o ID como query param.
    return router.createUrlTree(['/'], { queryParams: { open_establishment_id: establishmentId } });
  }
  // Se não houver ID, apenas redireciona para a raiz.
  return router.createUrlTree(['/']);
};