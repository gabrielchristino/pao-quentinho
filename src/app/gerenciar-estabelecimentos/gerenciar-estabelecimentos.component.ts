import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstabelecimentosService } from '../services/estabelecimentos.service';
import { Estabelecimento } from '../estabelecimento.model';
import { of, catchError, Subject, takeUntil } from 'rxjs';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-gerenciar-estabelecimentos',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './gerenciar-estabelecimentos.component.html',
  styleUrl: './gerenciar-estabelecimentos.component.scss'
})
export class GerenciarEstabelecimentosComponent implements OnInit, OnDestroy {
  private estabelecimentosService = inject(EstabelecimentosService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private authService = inject(AuthService);
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
    // Futuramente, isso levará para a tela de edição
    this.snackBar.open('Funcionalidade de edição ainda não implementada.', 'Ok', { duration: 3000 });
    // this.router.navigate(['/editar-estabelecimento', id]);
  }

  apagar(id: number, nome: string): void {
    // Futuramente, isso chamará o serviço de delete
    this.snackBar.open('Funcionalidade de apagar ainda não implementada.', 'Ok', { duration: 3000 });
  }
}