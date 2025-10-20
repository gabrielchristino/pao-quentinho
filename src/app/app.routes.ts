import { Routes } from '@angular/router';
import { MapaComponent } from './mapa/mapa.component';
import { notificationRedirectGuard } from './notification-redirect.guard';
import { authGuard } from './mapa/auth.guard';

export const routes: Routes = [
  // Rota principal, exibe a lista de estabelecimentos
  { path: '', component: MapaComponent, pathMatch: 'full' },

  // Rota para interceptar cliques de notificação.
  { path: 'estabelecimento/:id', component: MapaComponent, canActivate: [notificationRedirectGuard] },
  
  // Rota para cadastrar estabelecimentos
  {
    path: 'cadastrar-estabelecimento',
    loadComponent: () => import('./cadastro-estabelecimento/cadastro-estabelecimento.component').then(m => m.CadastroEstabelecimentoComponent),
    canActivate: [authGuard] // Protege esta rota
  },

  // Rota para gerenciar os estabelecimentos do usuário logado
  {
    path: 'meus-estabelecimentos',
    loadComponent: () => import('./gerenciar-estabelecimentos/gerenciar-estabelecimentos.component').then(m => m.GerenciarEstabelecimentosComponent),
    canActivate: [authGuard] // Protege esta rota
  },
];
