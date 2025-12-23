import { Routes } from '@angular/router';
import { MapaComponent } from './mapa/mapa.component';
import { notificationRedirectGuard } from './notification-redirect.guard';
import { lojistaGuard } from './services/lojista.guard';
import { logadoGuard } from './services/logado';

export const routes: Routes = [
  // Rota principal, exibe a lista de estabelecimentos
  { path: '', component: MapaComponent, pathMatch: 'full', title: 'Pão Quentinho' },

  // Rota para interceptar cliques de notificação.
  { path: 'estabelecimento/:id', component: MapaComponent, canActivate: [notificationRedirectGuard], pathMatch: 'full', title: 'Detalhes do Estabelecimento' },
  
  // Rotas para reserva via notificação (Path Params para melhor compatibilidade mobile)
  { path: 'reservar/:token', component: MapaComponent, canActivate: [notificationRedirectGuard], title: 'Reservar Fornada' },
  
  // Rota para cadastrar estabelecimentos
  {
    path: 'cadastrar-estabelecimento',
    loadComponent: () => import('./cadastro-estabelecimento/cadastro-estabelecimento.component').then(m => m.CadastroEstabelecimentoComponent),
    canActivate: [lojistaGuard], // Protege esta rota para lojistas
    title: 'Cadastrar Estabelecimento'
  },

  // Rota para editar um estabelecimento existente
  {
    path: 'estabelecimento/:id/editar',
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
    canActivate: [logadoGuard], // Protege esta rota para usuários logados
    title: 'Padarias que sigo'
  },

  // Rota para o banner com QR Code do estabelecimento
  {
    path: 'estabelecimento/:id/banner',
    loadComponent: () => import('./banner-estabelecimento/banner-estabelecimento.component').then(m => m.BannerEstabelecimentoComponent),
    canActivate: [lojistaGuard], // Protege esta rota para lojistas
    title: 'Banner do Estabelecimento'
  },

  // Rota para a lista de reservas (Nova)
  {
    path: 'estabelecimento/:id/reservas',
    loadComponent: () => import('./lista-reservas/lista-reservas.component').then(m => m.ListaReservasComponent),
    canActivate: [lojistaGuard],
    title: 'Lista de Reservas'
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
    canActivate: [logadoGuard], // Protege esta rota para usuários logados
    title: 'Meus planos'
  }
];
