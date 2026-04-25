import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth-service/auth.service';

/**
 * Permite el acceso solo a usuarios autenticados con rol ADMIN.
 * - Sin token → redirige a /login
 * - Con token pero sin rol ADMIN → redirige a /dashboard
 */
export const adminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (!authService.isAdmin()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
