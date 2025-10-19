import { Routes } from '@angular/router';
import { MapaComponent } from './mapa/mapa.component';
import { notificationRedirectGuard } from './notification-redirect.guard';

export const routes: Routes = [
  // Rota principal, exibe a lista de estabelecimentos
  { path: '', component: MapaComponent, pathMatch: 'full' },

  // Rota para interceptar cliques de notificação.
  { path: 'estabelecimento/:id', component: MapaComponent, canActivate: [notificationRedirectGuard] },
  
  // Rota para cadastrar estabelecimentos
  {
    path: 'cadastrar-estabelecimento',
    loadComponent: () => import('./cadastro-estabelecimento/cadastro-estabelecimento.component').then(m => m.CadastroEstabelecimentoComponent)
  },
];
