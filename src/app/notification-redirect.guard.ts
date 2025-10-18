import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { MapStateService } from './services/map-state.service';

/**
 * Um guard que intercepta a navegação vinda de um clique de notificação.
 * Ele comanda o mapa para abrir o card do estabelecimento e redireciona
 * o usuário para a página inicial, cancelando a navegação original.
 */
export const notificationRedirectGuard: CanActivateFn = (route: ActivatedRouteSnapshot): boolean => {
  const mapStateService = inject(MapStateService);
  const establishmentId = route.paramMap.get('id');

  if (establishmentId) {
    mapStateService.selectEstablishment(Number(establishmentId));
  }
  // Permite que a navegação continue para o componente configurado na rota.
  return true;
};