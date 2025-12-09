import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, switchMap, tap, map, Subject, skip } from 'rxjs';
import { NotificationService } from './notification.service';

export interface Plan {
  id: number;
  name: string;
  description: string;
  benefits: string[];
  price: string;
}

export interface User {
  name: string;
  email: string;
  role: 'lojista' | 'cliente';
  plan: Plan | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'pao-quentinho-token';

  private authState = new BehaviorSubject<boolean>(this.isLoggedIn());
  public authState$ = this.authState.asObservable();

  private requestLoginSource = new Subject<void>();
  public requestLogin$ = this.requestLoginSource.asObservable();

  private currentUserSubject = new BehaviorSubject<User | null>(this.getCurrentUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    // A inscrição no authState$ foi removida.
    // A inicialização do currentUserSubject com `this.getCurrentUser()` já garante que o usuário seja carregado no início.
    // Os métodos de login, logout e refreshToken já atualizam o currentUserSubject quando necessário.
  }
  register(userData: { name: string, email: string, password: string, isLojista?: boolean }): Observable<any> {
    const credentials = { ...userData, role: userData.isLojista ? 'lojista' : 'cliente' };
    return this.http.post(`${this.apiUrl}/register`, { name: credentials.name, email: credentials.email, password: credentials.password, role: credentials.role }).pipe(
      switchMap(() => this.login({ email: userData.email, password: userData.password }))
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
        this.updateCurrentUser(); // Atualiza o usuário com os dados do novo token.
      }),
      switchMap(() => this.sync())
    );
  }

  refreshToken(): Observable<{ token: string }> {
    return this.http.get<{ token: string }>(`${this.apiUrl}/refresh`).pipe(
      tap(response => {
        this.setToken(response.token);
        this.updateCurrentUser();
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('user-subscriptions');
    this.authState.next(false);
    this.currentUserSubject.next(null);
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
      const payload = token.split('.')[1];
      const decodedPayload = decodeURIComponent(atob(payload).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(decodedPayload);
    } catch (e) {
      console.error('Falha ao decodificar o token:', e);
      return null;
    }
  }

  getUserRole(): 'lojista' | 'cliente' | null {
    return this.decodeToken()?.role ?? null;
  }

  public isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    return true;
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  public getCurrentUser(): User | null {
    const decodedToken = this.decodeToken();
    if (decodedToken) {
      return { name: decodedToken.name, email: decodedToken.email, role: decodedToken.role, plan: decodedToken.plan };
    }
    return null;
  }

  public requestLogin(): void {
    this.requestLoginSource.next();
  }

  private updateCurrentUser(): void {
    this.currentUserSubject.next(this.getCurrentUser());
  }
}