import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EstabelecimentosService } from './services/estabelecimentos.service';
import { Estabelecimento } from './estabelecimento.model';
import { Observable, filter, map, switchMap } from 'rxjs';

@Component({
  selector: 'app-estabelecimento-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './estabelecimento-detalhe.component.html',
  styleUrl: './estabelecimento-detalhe.component.scss'
})
export class EstabelecimentoDetalheComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private estabelecimentosService = inject(EstabelecimentosService);

  estabelecimento$!: Observable<Estabelecimento | undefined>;

  ngOnInit(): void {
    this.estabelecimento$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      filter((id): id is string => id !== null),
      switchMap(id => this.estabelecimentosService.getEstabelecimentoById(id))
    );
  }
}