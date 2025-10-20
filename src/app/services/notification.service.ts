import { ApplicationRef, Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
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
  private readonly apiUrl = 'https://pao-quentinho-backend-production.up.railway.app/api';

  private http = inject(HttpClient);
  private swPush = inject(SwPush);
  private appRef = inject(ApplicationRef);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  addPushSubscriber(sub: PushSubscription, estabelecimentoId: number): Observable<any> {
    // Se o usuário não estiver logado, salvamos a inscrição localmente para sincronizar depois.
    if (!this.authService.isLoggedIn()) {
      const subAsJson = sub.toJSON();
      const anonymousSubs = JSON.parse(localStorage.getItem('anonymous-subscriptions') || '[]');
      // Evita adicionar endpoints duplicados
      if (!anonymousSubs.some((s: any) => s.endpoint === subAsJson.endpoint)) {
        anonymousSubs.push(subAsJson);
        localStorage.setItem('anonymous-subscriptions', JSON.stringify(anonymousSubs));
        console.log('[SUB-ANON] Inscrição anônima salva localmente.');
      }
    }
    return this.http.post(`${this.apiUrl}/subscribe`, { subscription: sub.toJSON(), estabelecimentoId });
  }

  getVapidPublicKey(): Observable<string> {
    return this.http.get(`${this.apiUrl}/vapid-public-key`, { responseType: 'text' });
  }

  syncSubscriptions(anonymousEndpoints: string[]): Observable<{ syncedEstablishmentIds: number[] }> {
    return this.http.post<{ syncedEstablishmentIds: number[] }>(`${this.apiUrl}/auth/sync`, { anonymousEndpoints })
      .pipe(
        tap(response => {
          // Após a sincronização, limpamos os endpoints anônimos do localStorage
          // para não enviá-los novamente em um futuro login.
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

    // A função que será executada APENAS se a permissão for concedida.
    const onGranted = async () => {
      let snackBarRef: MatSnackBarRef<SimpleSnackBar> | null = null;
      try {
        // 1. Verifica se já existe uma inscrição push neste dispositivo.
        let currentSub = await this.swPush.subscription.toPromise();

        // 2. Se não existir, precisamos criar uma.
        if (!currentSub) {
          console.log('[SYNC-SUB] Nenhuma inscrição push encontrada. Criando uma nova...');
          snackBarRef = this.snackBar.open('Ativando notificações para este dispositivo...', undefined, { duration: 0 });

          // Para criar uma inscrição, precisamos da chave VAPID.
          const vapidPublicKey = await firstValueFrom(this.getVapidPublicKey());
          currentSub = await this.swPush.requestSubscription({ serverPublicKey: vapidPublicKey });
          console.log('[SYNC-SUB] Nova inscrição push criada:', currentSub);
        }

        // 3. Agora com uma inscrição (existente ou nova), sincronizamos o que falta.
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

    // Inicia o fluxo de permissão.
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

      // 2. Pega os IDs dos estabelecimentos que JÁ ESTÃO inscritos neste dispositivo.
      const existingSubs = JSON.parse(localStorage.getItem('user-subscriptions') || '[]');
      const subscribedIdsOnThisDevice = new Set<number>(existingSubs.map((s: any) => s.establishmentId));

      // 3. Filtra para encontrar os que o usuário segue mas que não estão inscritos AQUI.
      const missingIds = syncedEstablishmentIds.filter(id => !subscribedIdsOnThisDevice.has(id));

      if (missingIds.length === 0) {
        console.log('[SYNC-SUB] Todas as inscrições já estão sincronizadas neste dispositivo.');
        return 0;
      }

      console.log(`[SYNC-SUB] Encontradas ${missingIds.length} inscrições para sincronizar:`, missingIds);

      // 4. Itera e se inscreve nos que faltam.
      for (const id of missingIds) {
        await firstValueFrom(this.addPushSubscriber(currentSub, id));
      }
      return missingIds.length;
    } catch (error) {
      console.error('[SYNC-SUB] Erro ao sincronizar inscrições faltantes:', error);
      return 0;
    }
  }
}