import { Routes } from '@angular/router';
import { MapaComponent } from './mapa/mapa.component';
import { notificationRedirectGuard } from './notification-redirect.guard';

export const routes: Routes = [
  // Rota principal, exibe a lista de estabelecimentos
  { path: '', component: MapaComponent, pathMatch: 'full' },

  // Rota para interceptar cliques de notificação.
  // O guard comanda o mapa e a rota carrega o componente do mapa diretamente.
  { path: 'estabelecimento/:id', component: MapaComponent, canActivate: [notificationRedirectGuard] },
];
