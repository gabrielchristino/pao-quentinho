import { Routes } from '@angular/router';
import { MapaComponent } from './mapa/mapa.component';
import { notificationRedirectGuard } from './guards/notification-redirect.guard';

export const routes: Routes = [
  // Rota principal, exibe a lista de estabelecimentos
  { path: '', component: MapaComponent, pathMatch: 'full' },

  // Rota para interceptar cliques de notificação.
  { path: 'estabelecimento/:id', component: MapaComponent, canActivate: [notificationRedirectGuard] }
];
