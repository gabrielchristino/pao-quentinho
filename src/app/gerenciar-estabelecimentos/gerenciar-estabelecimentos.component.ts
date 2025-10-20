import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstabelecimentosService } from '../services/estabelecimentos.service';
import { Estabelecimento } from '../estabelecimento.model';
import { of, catchError, Subject, takeUntil, finalize } from 'rxjs';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-gerenciar-estabelecimentos',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule
  ],
  templateUrl: './gerenciar-estabelecimentos.component.html',
  styleUrl: './gerenciar-estabelecimentos.component.scss'
})
export class GerenciarEstabelecimentosComponent implements OnInit, OnDestroy {
  private estabelecimentosService = inject(EstabelecimentosService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  meusEstabelecimentos: Estabelecimento[] = [];
  isLoading = true;

  ngOnInit(): void {
    // Listen for authentication state changes
    this.authService.authState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoggedIn => {
        if (!isLoggedIn) {
          this.meusEstabelecimentos = []; // Clear the list on logout
        } else {
          // If the user logs in (or is already logged in), load the data.
          this.loadEstabelecimentos();
        }
      });
  }

  private loadEstabelecimentos(): void {
    this.estabelecimentosService.getMeusEstabelecimentos().pipe(
      catchError(err => {
        // Se o token for inválido ou expirado, o interceptor pode não pegar.
        // Tratamos o erro 401 (Não Autorizado) aqui.
        if (err.status === 401) {
          this.snackBar.open('Sua sessão expirou. Por favor, faça login novamente.', 'Fechar', { duration: 5000 });
          this.router.navigate(['/']); // Redireciona para o mapa para logar
        } else {
          this.snackBar.open('Erro ao carregar seus estabelecimentos.', 'Fechar', { duration: 3000 });
        }
        this.isLoading = false;
        return of([]); // Retorna um array vazio em caso de erro
      })
    ).subscribe({
      next: (estabelecimentos) => {
        this.meusEstabelecimentos = estabelecimentos;
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  editar(id: number): void {
    // Navega para a rota de edição, passando o ID do estabelecimento
    this.router.navigate(['/editar-estabelecimento', id]);
  }

  apagar(id: number, nome: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar Exclusão',
        message: `Tem certeza que deseja apagar o estabelecimento "${nome}"? Esta ação não pode ser desfeita.`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) { // Se o usuário confirmou no diálogo
        this.isLoading = true;
        this.estabelecimentosService.deleteEstabelecimento(id).pipe(
          finalize(() => this.isLoading = false)
        ).subscribe({
          next: () => {
            this.snackBar.open('Estabelecimento apagado com sucesso!', 'Ok', { duration: 3000 });
            // Remove o item da lista local para atualizar a UI instantaneamente
            this.meusEstabelecimentos = this.meusEstabelecimentos.filter(est => est.id !== id);
          },
          error: (err) => {
            const message = err.error?.message || 'Erro ao apagar o estabelecimento.';
            this.snackBar.open(message, 'Fechar', { duration: 4000 });
          }
        });
      }
    });
  }
}