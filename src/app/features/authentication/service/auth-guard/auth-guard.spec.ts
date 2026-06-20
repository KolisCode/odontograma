import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { authGuard } from './auth-guard';
import { AuthService } from '../auth-service/auth.service';

describe('authGuard', () => {
  let loggedIn: boolean;
  let navigatedTo: unknown = null;

  const authServiceMock = { isLoggedIn: () => loggedIn } as Partial<AuthService>;
  const routerMock = {
    navigate: (commands: unknown) => {
      navigatedTo = commands;
      return Promise.resolve(true);
    },
  } as Partial<Router>;

  beforeEach(() => {
    navigatedTo = null;
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('permite el acceso cuando hay sesión activa', () => {
    loggedIn = true;
    const result = TestBed.runInInjectionContext(() => authGuard());
    expect(result).toBe(true);
    expect(navigatedTo).toBeNull();
  });

  it('redirige a /login cuando no hay sesión', () => {
    loggedIn = false;
    const result = TestBed.runInInjectionContext(() => authGuard());
    expect(result).toBe(false);
    expect(navigatedTo).toEqual(['/login']);
  });
});
