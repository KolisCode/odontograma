import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth-service/auth.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  let token: string | null = null;
  try { token = localStorage.getItem('token'); } catch { /* storage unavailable */ }

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && router.url !== '/login') {
        authService.logout();
        router.navigate(['/login']);
      }
      if (error.status === 403) {
        const msg = error.error?.message || 'No tienes permiso para realizar esta acción';
        const friendly = new HttpErrorResponse({
          error: { ok: false, message: msg },
          headers: error.headers,
          status: 403,
          statusText: error.statusText,
          url: error.url ?? undefined,
        });
        return throwError(() => friendly);
      }
      return throwError(() => error);
    })
  );
};
