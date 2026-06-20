import { ApplicationConfig, APP_INITIALIZER, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { tokenInterceptor } from './features/authentication/service/token-interceptor/token-interceptor';
import { AuthService } from './features/authentication/service/auth-service/auth.service';

function initAuth(authService: AuthService): () => Promise<void> {
  return async () => {
    if (!authService.getToken()) return;
    try {
      await firstValueFrom(authService.getProfile());
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 401 || status === 403) {
        authService.logout();
      }
      // Error de red (status 0): mantener la sesión, el backend rechazará con 401 cuando responda
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
