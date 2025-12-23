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
  const token = route.paramMap.get('token');

  if (establishmentId) {
    const queryParams: any = {
      ...route.queryParams,
      open_establishment_id: establishmentId 
    };

    // Redireciona para a raiz (Mapa) com os parâmetros normalizados.
    // Usamos replaceUrl: true para evitar que a URL intermediária fique no histórico.
    router.navigate(['/'], { queryParams, replaceUrl: true });
    return false;
  }

  // Se houver um token de reserva, redireciona para a raiz com o token
  if (token) {
    router.navigate(['/'], { queryParams: { 
      token: decodeURIComponent(token),
      ...route.queryParams // Mantém os parâmetros de debug (debug_source) para você ver na URL
    }, replaceUrl: true });
    return false;
  }

  // Se não houver ID, apenas redireciona para a raiz.
  router.navigate(['/'], { queryParams: route.queryParams, replaceUrl: true });
  return false;
};