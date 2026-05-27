import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, finalize } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = `${environment.apiUrl}/auth`;


  constructor(private http: HttpClient) {}

  register(data: any): Observable<any> {
    return this.http.post(`${this.api}/register`, data);
  }

  login(data: { correo: string; password: string }): Observable<any> {
    return this.http.post(`${this.api}/login`, data).pipe(
      tap((response: any) => {
        try {
          const token = response?.data?.token;
          const user = response?.data?.user;
          if (token) localStorage.setItem('token', token);
          if (user) localStorage.setItem('user', JSON.stringify(user));
        } catch { /* storage unavailable */ }
      })
    );
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.api}/me`);
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

  getUser(): any | null {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
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

  changeOwnPassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.patch(`${this.api}/me/password`, { currentPassword, newPassword });
  }
}