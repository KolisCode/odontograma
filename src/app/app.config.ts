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
    } catch {
      authService.logout();
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
