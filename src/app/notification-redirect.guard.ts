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
  const fornadaId = route.paramMap.get('fornadaId');
  const time = route.paramMap.get('time');

  if (establishmentId) {
    const queryParams: any = {
      ...route.queryParams,
      open_establishment_id: establishmentId 
    };

    // Se vieram parâmetros de rota (Path Params) de reserva, converte para Query Params
    if (fornadaId) {
      queryParams['action'] = 'reserve';
      queryParams['fornadaId'] = decodeURIComponent(fornadaId);
    } else if (time) {
      queryParams['action'] = 'reserve';
      queryParams['time'] = decodeURIComponent(time);
    }

    // Redireciona para a raiz (Mapa) com os parâmetros normalizados
    return router.createUrlTree(['/'], { queryParams });
  }
  // Se não houver ID, apenas redireciona para a raiz.
  return router.createUrlTree(['/'], { queryParams: route.queryParams });
};