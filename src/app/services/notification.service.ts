import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = 'https://pao-quentinho-backend-production.up.railway.app/api';

  constructor(private http: HttpClient) { }

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
}