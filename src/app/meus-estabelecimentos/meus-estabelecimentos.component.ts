import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { finalize } from 'rxjs';
import { EstabelecimentosService } from '../services/estabelecimentos.service';
import { Estabelecimento } from '../estabelecimento.model';
import { NotificationService } from '../services/notification.service';
import { RouterLink } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-meus-estabelecimentos',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatTooltipModule
  ],
  templateUrl: './meus-estabelecimentos.component.html',
  styleUrl: './meus-estabelecimentos.component.scss'
})
export class MeusEstabelecimentosComponent implements OnInit {
  private estabelecimentosService = inject(EstabelecimentosService);
  private notificationService = inject(NotificationService);
  private snackBar = inject(MatSnackBar);

  estabelecimentos: Estabelecimento[] = [];
  isLoading = true;
  unsubscribingId: number | null = null;

  ngOnInit(): void {
    this.carregarEstabelecimentos();
  }

  carregarEstabelecimentos(): void {
    this.isLoading = true;
    this.estabelecimentosService.getMinhasInscricoes().pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (data) => {
        this.estabelecimentos = data;
      },
      error: () => {
        this.snackBar.open('Erro ao carregar seus estabelecimentos.', 'Fechar', { duration: 5000 });
      }
    });
  }

  deixarDeSeguir(estabelecimento: Estabelecimento, event: MouseEvent): void {
    event.stopPropagation();
    if (this.unsubscribingId) return;

    this.unsubscribingId = estabelecimento.id;

    this.notificationService.unsubscribeFromEstablishment(estabelecimento.id).pipe(
      finalize(() => this.unsubscribingId = null)
    ).subscribe({
      next: () => {
        // Remove o estabelecimento da lista localmente para feedback instantâneo
        this.estabelecimentos = this.estabelecimentos.filter(e => e.id !== estabelecimento.id);
        this.snackBar.open(`Você não seguirá mais "${estabelecimento.nome}".`, 'Ok', { duration: 3000 });
      },
      error: (err) => {
        const errorMessage = err.status === 404
          ? 'Inscrição não encontrada para este dispositivo.'
          : 'Erro ao cancelar a inscrição. Tente novamente.';
        this.snackBar.open(errorMessage, 'Fechar', { duration: 5000 });
      }
    });
  }
}