import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth-service/auth.service';

export const authGuard = () => {

  const auth = inject(AuthService);
  const router = inject(Router);

  if(auth.isLogged()){
    return true;
  }

  router.navigate(['/login']);
  return false;

};