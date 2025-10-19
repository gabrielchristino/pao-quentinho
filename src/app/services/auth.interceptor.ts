import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Verifica se a requisição é para a nossa API e se o usuário está logado
  if (token && req.url.startsWith('https://pao-quentinho-backend-production.up.railway.app/api')) {
    // Clona a requisição e adiciona o cabeçalho de autorização
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(cloned);
  }

  // Para requisições externas (ViaCEP, etc.) ou se não estiver logado, envia a requisição original
  return next(req);
};