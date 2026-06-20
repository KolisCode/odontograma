import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, finalize } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse, AuthUser } from '../../../../shared/api.types';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = `${environment.apiUrl}/auth`;


  constructor(private http: HttpClient) {}

  register(data: unknown): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.api}/register`, data);
  }

  login(data: { correo: string; password: string }): Observable<ApiResponse<{ token: string; user: AuthUser }>> {
    return this.http.post<ApiResponse<{ token: string; user: AuthUser }>>(`${this.api}/login`, data).pipe(
      tap((response) => {
        try {
          const token = response?.data?.token;
          const user = response?.data?.user;
          if (token) localStorage.setItem('token', token);
          if (user) localStorage.setItem('user', JSON.stringify(user));
        } catch { /* storage unavailable */ }
      })
    );
  }

  getProfile(): Observable<ApiResponse<AuthUser>> {
    return this.http.get<ApiResponse<AuthUser>>(`${this.api}/me`);
  }

  logout(): void {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('biodont_last_export');
      localStorage.removeItem('biodont_last_backup');
    } catch { /* storage unavailable */ }
  }

  logoutFromServer(): Observable<void> {
    return this.http.post<void>(`${this.api}/logout`, {}).pipe(
      catchError(() => of(undefined as unknown as void)),
      finalize(() => this.logout()),
    );
  }

  getToken(): string | null {
    try { return localStorage.getItem('token'); } catch { return null; }
  }

  getUser(): AuthUser | null {
    try {
      const user = localStorage.getItem('user');
      return user ? (JSON.parse(user) as AuthUser) : null;
    } catch { return null; }
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    try {
      const payload = JSON.parse(atob(parts[1]));
      return payload.exp * 1000 > Date.now();
    } catch { return false; }
  }

  getUserRole(): string | null {
    return this.getUser()?.rol ?? null;
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'ADMIN';
  }

  hasRole(...roles: string[]): boolean {
    const rol = this.getUserRole();
    return rol ? roles.includes(rol) : false;
  }

  // Personal que puede gestionar pacientes, finanzas y módulos clínicos
  // (alineado con el RBAC del backend; RECEPCION queda fuera).
  canManage(): boolean {
    return this.hasRole('ADMIN', 'ODONTOLOGO', 'AUXILIAR');
  }

  // Acceso a la historia clínica y submódulos (GET exige rol clínico en el backend).
  canAccessClinical(): boolean {
    return this.hasRole('ADMIN', 'ODONTOLOGO', 'AUXILIAR');
  }

  changeOwnPassword(currentPassword: string, newPassword: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.api}/me/password`, { currentPassword, newPassword });
  }
}