import { Routes } from '@angular/router';
import { MapaComponent } from './mapa/mapa.component';
import { notificationRedirectGuard } from './notification-redirect.guard';
import { lojistaGuard } from './services/lojista.guard';
import { MeusEstabelecimentosComponent } from './meus-estabelecimentos/meus-estabelecimentos.component';

export const routes: Routes = [
  // Rota principal, exibe a lista de estabelecimentos
  { path: '', component: MapaComponent, pathMatch: 'full' },

  // Rota para interceptar cliques de notificação.
  { path: 'estabelecimento/:id', component: MapaComponent, canActivate: [notificationRedirectGuard] },
  
  // Rota para cadastrar estabelecimentos
  {
    path: 'cadastrar-estabelecimento',
    loadComponent: () => import('./cadastro-estabelecimento/cadastro-estabelecimento.component').then(m => m.CadastroEstabelecimentoComponent),
    canActivate: [lojistaGuard] // Protege esta rota para lojistas
  },

  // Rota para editar um estabelecimento existente
  {
    path: 'editar-estabelecimento/:id',
    loadComponent: () => import('./cadastro-estabelecimento/cadastro-estabelecimento.component').then(m => m.CadastroEstabelecimentoComponent),
    canActivate: [lojistaGuard] // Protege esta rota para lojistas
  },

  // Rota para gerenciar os estabelecimentos do usuário logado
  {
    path: 'meus-estabelecimentos',
    loadComponent: () => import('./gerenciar-estabelecimentos/gerenciar-estabelecimentos.component').then(m => m.GerenciarEstabelecimentosComponent),
    canActivate: [lojistaGuard] // Protege esta rota para lojistas
  },

  // Rota para gerenciar as inscrições do usuário
  {
    path: 'minhas-inscricoes',
    loadComponent: () => import('./meus-estabelecimentos/meus-estabelecimentos.component').then(m => m.MeusEstabelecimentosComponent),
  },
];
