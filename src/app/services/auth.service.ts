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
    // Limpa também as inscrições locais para evitar inconsistências ao logar com outro usuário.
    localStorage.removeItem('user-subscriptions');
    this.authState.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private decodeToken(): any | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    try {
      // O payload do JWT fica na segunda parte, decodificado de Base64
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      console.error('Falha ao decodificar o token:', e);
      return null;
    }
  }

  getUserRole(): 'lojista' | 'cliente' | null {
    return this.decodeToken()?.role ?? null;
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