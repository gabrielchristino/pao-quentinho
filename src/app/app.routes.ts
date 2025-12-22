import { Routes } from '@angular/router';
import { MapaComponent } from './mapa/mapa.component';
import { notificationRedirectGuard } from './notification-redirect.guard';
import { lojistaGuard } from './services/lojista.guard';

export const routes: Routes = [
  // Rota principal, exibe a lista de estabelecimentos
  { path: '', component: MapaComponent, pathMatch: 'full', title: 'Pão Quentinho' },

  // Rota para interceptar cliques de notificação.
  { path: 'estabelecimento/:id', component: MapaComponent, canActivate: [notificationRedirectGuard], title: 'Detalhes do Estabelecimento' },
  
  // Rota para cadastrar estabelecimentos
  {
    path: 'cadastrar-estabelecimento',
    loadComponent: () => import('./cadastro-estabelecimento/cadastro-estabelecimento.component').then(m => m.CadastroEstabelecimentoComponent),
    canActivate: [lojistaGuard], // Protege esta rota para lojistas
    title: 'Cadastrar Estabelecimento'
  },

  // Rota para editar um estabelecimento existente
  {
    path: 'editar-estabelecimento/:id',
    loadComponent: () => import('./cadastro-estabelecimento/cadastro-estabelecimento.component').then(m => m.CadastroEstabelecimentoComponent),
    canActivate: [lojistaGuard], // Protege esta rota para lojistas
    title: 'Editar Estabelecimento'
  },

  // Rota para gerenciar os estabelecimentos do usuário logado
  {
    path: 'meus-estabelecimentos',
    loadComponent: () => import('./gerenciar-estabelecimentos/gerenciar-estabelecimentos.component').then(m => m.GerenciarEstabelecimentosComponent),
    canActivate: [lojistaGuard], // Protege esta rota para lojistas
    title: 'Meus Estabelecimentos'
  },

  // Rota para gerenciar as inscrições do usuário
  {
    path: 'minhas-inscricoes',
    loadComponent: () => import('./minhas-inscricoes/minhas-inscricoes.component').then(m => m.MinhasInscricoesComponent),
    title: 'Padarias que sigo'
  },

  // Rota para o banner com QR Code do estabelecimento
  {
    path: 'estabelecimento/:id/banner',
    loadComponent: () => import('./banner-estabelecimento/banner-estabelecimento.component').then(m => m.BannerEstabelecimentoComponent),
    canActivate: [lojistaGuard], // Protege esta rota para lojistas
    title: 'Banner do Estabelecimento'
  },

  // Rota para a página de ajuda
  {
    path: 'ajuda',
    loadComponent: () => import('./ajuda/ajuda.component').then(m => m.AjudaComponent),
    title: 'Ajuda'
  },

  // Rota para a página sobre o Pão Quentinho
  {
    path: 'sobre',
    loadComponent: () => import('./sobre/sobre.component').then(m => m.SobreComponent),
    title: 'Sobre'
  },

  // Rota para a página de planos de assinatura
  {
    path: 'planos',
    loadComponent: () => import('./planos/plans.component').then(m => m.PlansComponent),
    title: 'Meus planos'
  }
];
