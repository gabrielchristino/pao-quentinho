import { ApplicationRef, Injectable, Injector, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, switchMap, take, tap } from 'rxjs';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarRef, SimpleSnackBar } from '@angular/material/snack-bar';
import { PermissionDialogComponent, PermissionDialogData } from '../mapa/permission-diolog.component';
import { AuthService } from './auth.service';
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = environment.apiUrl;

  private http = inject(HttpClient);
  private swPush = inject(SwPush);
  private appRef = inject(ApplicationRef);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  // Usamos o Injector para quebrar a dependência circular com o AuthService.
  private injector = inject(Injector);
  private _authService: AuthService | null = null;

  private get authService(): AuthService {
    if (!this._authService) {
      this._authService = this.injector.get(AuthService);
    }
    return this._authService;
  }

  addPushSubscriber(sub: PushSubscription, estabelecimentoId: number): Observable<any> {
    if (!this.authService.isLoggedIn()) {
      const subAsJson = sub.toJSON();
      const anonymousSubs = JSON.parse(localStorage.getItem('anonymous-subscriptions') || '[]');
      if (!anonymousSubs.some((s: any) => s.endpoint === subAsJson.endpoint)) {
        anonymousSubs.push(subAsJson);
        localStorage.setItem('anonymous-subscriptions', JSON.stringify(anonymousSubs));
        console.log('[SUB-ANON] Inscrição anônima salva localmente.');
      }
    }
    return this.http.post(`${this.apiUrl}/subscribe`, { subscription: sub.toJSON(), estabelecimentoId });
  }

  unsubscribeFromEstablishment(estabelecimentoId: number): Observable<any> {
    return this.swPush.subscription.pipe(
      take(1),
      switchMap(sub => {
        if (!sub) {
          // Não há inscrição push neste dispositivo, então não há o que fazer no backend.
          // Podemos considerar isso um sucesso do ponto de vista do cliente.
          return of({ message: 'No subscription on this device.' });
        }
        const params = new HttpParams()
          .set('endpoint', sub.endpoint)
          .set('estabelecimentoId', estabelecimentoId.toString());
        return this.http.delete(`${this.apiUrl}/unsubscribe`, { params });
      })
    );
  }

  getVapidPublicKey(): Observable<string> {
    return this.http.get(`${this.apiUrl}/vapid-public-key`, { responseType: 'text' });
  }

  syncSubscriptions(anonymousEndpoints: string[]): Observable<{ syncedEstablishmentIds: number[] }> {
    return this.http.post<{ syncedEstablishmentIds: number[] }>(`${this.apiUrl}/auth/sync`, { anonymousEndpoints })
      .pipe(
        tap(() => {
          if (anonymousEndpoints.length > 0) {
            localStorage.removeItem('anonymous-subscriptions');
          }
        })
      );
  }

  /**
   * Orquestra a sincronização de inscrições após o login.
   * Verifica a permissão de notificação e a solicita se necessário antes de sincronizar.
   * @param syncedEstablishmentIds IDs dos estabelecimentos que o usuário segue.
   */
  triggerSubscriptionSync(syncedEstablishmentIds: number[]): void {
    if (!this.swPush.isEnabled || syncedEstablishmentIds.length === 0) {
      return;
    }

    const onGranted = async () => {
      let snackBarRef: MatSnackBarRef<SimpleSnackBar> | null = null;
      try {
        let currentSub = await this.swPush.subscription.toPromise();

        if (!currentSub) {
          console.log('[SYNC-SUB] Nenhuma inscrição push encontrada. Criando uma nova...');
          snackBarRef = this.snackBar.open('Ativando notificações para este dispositivo...', undefined, { duration: 0 });

          const vapidPublicKey = await firstValueFrom(this.getVapidPublicKey());
          currentSub = await this.swPush.requestSubscription({ serverPublicKey: vapidPublicKey });
          console.log('[SYNC-SUB] Nova inscrição push criada:', currentSub);
        }

        const count = await this.subscribeToMissingEstablishments(currentSub, syncedEstablishmentIds);
        snackBarRef?.dismiss();

        if (count > 0) {
          this.snackBar.open(`${count} inscrições foram sincronizadas para este dispositivo!`, 'Ok', { duration: 4000 });
        }
      } catch (error) {
        snackBarRef?.dismiss();
        console.error('[SYNC-SUB] Falha ao executar a sincronização pós-permissão.', error);
        this.snackBar.open('Ocorreu um erro ao sincronizar suas inscrições.', 'Fechar', { duration: 4000 });
      }
    };

    this.solicitarPermissaoDeNotificacao(onGranted);
  }

  /**
   * Lida com a lógica de pedir permissão de notificação ao usuário,
   * mostrando um pré-alerta amigável.
   * @param onGranted Callback a ser executado se a permissão for concedida.
   */
  solicitarPermissaoDeNotificacao(onGranted: () => void): void {
    if (!('Notification' in window) || !this.swPush.isEnabled) return;

    const permission = Notification.permission;

    if (permission === 'granted') {
      onGranted();
    } else if (permission === 'default') {
      const dialogRef = this.dialog.open<PermissionDialogComponent, PermissionDialogData, boolean>(PermissionDialogComponent, {
        data: {
          icon: 'notifications_active',
          title: 'Permitir notificações?',
          content: 'Quer ser avisado quando uma fornada sair? Ative as notificações para sincronizar suas inscrições neste dispositivo.',
          confirmButton: 'Permitir',
          cancelButton: 'Agora não'
        },
        disableClose: true
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          Notification.requestPermission().then(p => { if (p === 'granted') onGranted(); });
        }
      });
    } else if (permission === 'denied') {
      this.snackBar.open('As notificações estão bloqueadas. Habilite nas configurações do navegador para sincronizar.', 'Ok', { duration: 7000 });
    }
  }

  /**
   * Verifica as inscrições do usuário e se inscreve automaticamente nos estabelecimentos
   * que estão faltando neste dispositivo.
   * @param syncedEstablishmentIds IDs dos estabelecimentos que o usuário segue.
   */
  private async subscribeToMissingEstablishments(currentSub: PushSubscription, syncedEstablishmentIds: number[]): Promise<number> {
    if (!this.swPush.isEnabled || Notification.permission !== 'granted' || syncedEstablishmentIds.length === 0) {
      return 0;
    }

    try {
      console.log('[SYNC-SUB] Verificando inscrições faltantes com a inscrição push atual.');
      const existingSubs = JSON.parse(localStorage.getItem('user-subscriptions') || '[]');
      const subscribedIdsOnThisDevice = new Set<number>(existingSubs.map((s: any) => s.establishmentId));
      const missingIds = syncedEstablishmentIds.filter(id => !subscribedIdsOnThisDevice.has(id));
      
      if (missingIds.length === 0) {
        console.log('[SYNC-SUB] Todas as inscrições já estão sincronizadas neste dispositivo.');
        return 0;
      }

      console.log(`[SYNC-SUB] Encontradas ${missingIds.length} inscrições para sincronizar:`, missingIds);

      for (const id of missingIds) {
        await firstValueFrom(this.addPushSubscriber(currentSub, id));
      }
      return missingIds.length;
    } catch (error) {
      console.error('[SYNC-SUB] Erro ao sincronizar inscrições faltantes:', error);
      return 0;
    }
  }

  /**
   * Envia uma notificação manual para os seguidores de um estabelecimento.
   * @param estabelecimentoId O ID do estabelecimento.
   * @param title O título opcional da notificação.
   * @param message A mensagem opcional da notificação.
   */
  sendNotification(estabelecimentoId: number, title?: string, message?: string): Observable<any> {
    const payload = { title, message };
    return this.http.post(`${this.apiUrl}/notify/${estabelecimentoId}`, payload);
  }
}