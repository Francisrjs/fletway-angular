import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../data-access/auth-service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const state = authService.userState();
  const token = state?.session?.access_token;

  // Filtrar: Solo agregar token a tu API de Flask (evita enviarlo a otras APIs externas si las hubiera)
  const isApiUrl = req.url.includes('fletway-api'); // O tu URL base

  if (token && isApiUrl) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  return next(req);
};