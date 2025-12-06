import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstabelecimentosService } from '../services/estabelecimentos.service';
import { Estabelecimento } from '../estabelecimento.model';
import { of, catchError, Subject, takeUntil, finalize, switchMap } from 'rxjs';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../services/notification.service';
import { NotificationDialogComponent, NotificationDialogResult } from '../notification-dialog/notification-dialog.component';
import { SwPush } from '@angular/service-worker';

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
    MatDialogModule,
    MatExpansionModule,
    MatTooltipModule,
    MatChipsModule,
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
  private notificationService = inject(NotificationService);
  private swPush = inject(SwPush);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  meusEstabelecimentos: Estabelecimento[] = [];
  isSubscribing = false;
  isLoading = true;
  diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

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

    this.verificarEAtivarNotificacoes();
  }

  private loadEstabelecimentos(): void {
    this.estabelecimentosService.getMeusEstabelecimentos().pipe(
      catchError(err => {
        // Trata o erro 401 (Não Autorizado) caso o interceptor não o capture.
        if (err.status === 401) {
          this.snackBar.open('Sua sessão expirou. Por favor, faça login novamente.', 'Fechar', { duration: 5000 });
          this.router.navigate(['/'], { replaceUrl: true }); // Redireciona para o mapa para logar
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
            this.meusEstabelecimentos = this.meusEstabelecimentos.filter(est => {
              est.proximaFornada = est.proximaFornada || [];
              return est.id !== id;
            });
          },
          error: (err) => {
            const message = err.error?.message || 'Erro ao apagar o estabelecimento.';
            this.snackBar.open(message, 'Fechar', { duration: 4000 });
          }
        });
      }
    });
  }

  notificar(id: number, nome: string): void {
    const dialogRef = this.dialog.open(NotificationDialogComponent, {
      width: '90vw',
      maxWidth: '90vw',
      position: { top: '100px' },
      data: { establishmentName: nome }
    });

    dialogRef.afterClosed().subscribe((result: NotificationDialogResult | undefined) => {
      // Procede apenas se o usuário clicou em "Enviar" e temos um resultado.
      if (result) {
        this.isLoading = true;
        this.notificationService.sendNotification(id, result.title, result.message).pipe(
          finalize(() => this.isLoading = false)
        ).subscribe({
          next: (response) => {
            this.snackBar.open(response.message || 'Notificações enviadas com sucesso!', 'Ok', { duration: 4000 });
          },
          error: (err) => {
            const message = err.error?.message || 'Ocorreu um erro ao enviar as notificações.';
            this.snackBar.open(message, 'Fechar', { duration: 5000 });
          }
        });
      }
    });
  }

  private verificarEAtivarNotificacoes(): void {
    if (!this.swPush.isEnabled) {
      console.warn('Push Notifications não são suportadas neste navegador.');
      return;
    }

    navigator.permissions.query({ name: 'push' }).then(permissionStatus => {
      if (permissionStatus.state === 'prompt') {
        // Se a permissão ainda não foi solicitada, inicia o fluxo automaticamente.
        this.habilitarNotificacoes();
      } else if (permissionStatus.state === 'denied') {
        // Se foi negada, informa o usuário.
        this.snackBar.open('As notificações estão bloqueadas. Habilite nas configurações do navegador para receber alertas.', 'Ok', { duration: 7000 });
      }
      // Se for 'granted', não faz nada, pois já está tudo certo.
    });
  }

  private habilitarNotificacoes(): void {
    this.isSubscribing = true;
    this.notificationService.solicitarPermissaoDeNotificacao(() => {
      // Callback executado quando a permissão é concedida.
      this.notificationService.getVapidPublicKey().pipe(
        switchMap(vapidPublicKey => this.swPush.requestSubscription({ serverPublicKey: vapidPublicKey })),
        switchMap(sub => this.notificationService.addPushSubscriber(sub, -1)), // -1 indica inscrição de lojista
        finalize(() => {
          this.isSubscribing = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: () => this.snackBar.open('Notificações habilitadas para este dispositivo!', 'Ok', { duration: 4000 }),
        error: (err) => this.snackBar.open('Não foi possível habilitar as notificações.', 'Fechar', { duration: 5000 })
      });
    });
  }

  abrirBanner(id: number, nome: string): void {
    this.router.navigate(['/estabelecimento', id, 'banner'], {
      state: { nomeEstabelecimento: nome }
    });
  }
} 