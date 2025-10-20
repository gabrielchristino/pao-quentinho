import { ApplicationRef, Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, tap } from 'rxjs';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { MapaComponent } from '../mapa/mapa.component';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = 'https://pao-quentinho-backend-production.up.railway.app/api';

  private http = inject(HttpClient);
  private swPush = inject(SwPush);
  private appRef = inject(ApplicationRef);

  addPushSubscriber(sub: PushSubscription, estabelecimentoId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/subscribe`, { subscription: sub, estabelecimentoId });
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
   * Verifica as inscrições do usuário e se inscreve automaticamente nos estabelecimentos
   * que estão faltando neste dispositivo.
   * @param syncedEstablishmentIds IDs dos estabelecimentos que o usuário segue.
   */
  async subscribeToMissingEstablishments(syncedEstablishmentIds: number[]): Promise<number> {
    if (!this.swPush.isEnabled || Notification.permission !== 'granted' || syncedEstablishmentIds.length === 0) {
      return 0;
    }

    try {
      // 1. Pega a inscrição ATUAL do dispositivo.
      const currentSub = await this.swPush.subscription.pipe(tap(sub => console.log("Current sub:", sub))).toPromise();

      // Se não há inscrição neste dispositivo, não há como saber o que está faltando.
      if (!currentSub) {
        console.log('[SYNC-SUB] Nenhuma inscrição ativa neste dispositivo. Nada a fazer.');
        return 0;
      }

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