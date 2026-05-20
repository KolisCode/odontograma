import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
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
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } catch { /* storage unavailable */ }
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
