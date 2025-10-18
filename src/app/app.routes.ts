import { Routes } from '@angular/router';
import { EstabelecimentoDetalheComponent } from './estabelecimento-detalhe.component';
import { EstabelecimentoListaComponent } from './pages/estabelecimento-lista/estabelecimento-lista.component';

export const routes: Routes = [
  // Rota principal, exibe a lista de estabelecimentos
  { path: '', component: EstabelecimentoListaComponent, pathMatch: 'full' },

  // Rota para exibir os detalhes de um estabelecimento específico
  { path: 'estabelecimento/:id', component: EstabelecimentoDetalheComponent },
];
