import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, switchMap, tap } from 'rxjs';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private readonly apiUrl = 'https://pao-quentinho-backend-production.up.railway.app/api/auth';
  private readonly TOKEN_KEY = 'pao-quentinho-token';

  private authState = new BehaviorSubject<boolean>(this.isLoggedIn());
  public authState$ = this.authState.asObservable();

  register(credentials: { name: string, email: string, password: string }): Observable<any> {
    // Após o registro, faz o login automaticamente para obter o token e iniciar a sincronização.
    return this.http.post(`${this.apiUrl}/register`, credentials).pipe(
      switchMap(() => this.login({ email: credentials.email, password: credentials.password }))
    );
  }

  private sync(): Observable<any> {
    // Pega as inscrições anônimas salvas localmente
    const anonymousSubs = JSON.parse(localStorage.getItem('anonymous-subscriptions') || '[]');
    const anonymousEndpoints = anonymousSubs.map((sub: any) => sub.endpoint);

    // Se não houver nada para sincronizar, retorna um observable vazio.
    if (anonymousEndpoints.length === 0) {
      return of(null);
    }

    return this.notificationService.syncSubscriptions(anonymousEndpoints);
  }

  login(credentials: { email: string, password: string }): Observable<any> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        this.setToken(response.token);
        this.authState.next(true);
      }),
      // Após o login, executa a sincronização
      switchMap(() => this.sync()) // O resultado de sync() será passado para o próximo operador
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.authState.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    // Opcional: decodificar o token para verificar a data de expiração
    // Por enquanto, a simples presença do token é suficiente.
    return true;
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }
}