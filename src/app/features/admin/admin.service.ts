import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExportData } from '../../services/export.service';
import { environment } from '../../../environments/environment';

export interface ExportConfig {
  pacientes?:    { incluir: boolean; soloActivos: boolean };
  movimientos?:  { incluir: boolean; fechaDesde: string; fechaHasta: string; estado: string };
  citas?:        { incluir: boolean; fechaDesde: string; fechaHasta: string; estado: string };
  tratamientos?: { incluir: boolean; soloActivos: boolean };
}

export interface HealthStatus {
  status: 'ok' | 'error';
  db: 'connected' | 'disconnected';
}

export interface UserRow {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
  activo: boolean;
  telefono?: string;
  documento?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly base    = environment.apiUrl;
  private readonly authApi = `${this.base}/auth`;
  private readonly adminApi = `${this.base}/admin`;

  constructor(private http: HttpClient) {}

  // ── Salud ────────────────────────────────────────────────────────────────
  checkHealth(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(`${this.base}/api/v1/health`);
  }

  // ── Exportación ──────────────────────────────────────────────────────────
  exportar(config: ExportConfig): Observable<{ ok: boolean; data: ExportData }> {
    return this.http.post<{ ok: boolean; data: ExportData }>(`${this.adminApi}/exportar`, config);
  }

  // ── Gestión de usuarios ───────────────────────────────────────────────────
  listUsers(): Observable<{ ok: boolean; data: UserRow[] }> {
    return this.http.get<{ ok: boolean; data: UserRow[] }>(`${this.authApi}/users`);
  }

  updateUserRole(id: number, rol: string): Observable<{ ok: boolean; data: UserRow }> {
    return this.http.patch<{ ok: boolean; data: UserRow }>(`${this.authApi}/users/${id}/role`, { rol });
  }

  updateUserStatus(id: number, activo: boolean): Observable<{ ok: boolean; data: UserRow }> {
    return this.http.patch<{ ok: boolean; data: UserRow }>(`${this.authApi}/users/${id}/status`, { activo });
  }

  changeUserPassword(id: number, password: string): Observable<{ ok: boolean; message: string }> {
    return this.http.patch<{ ok: boolean; message: string }>(`${this.authApi}/users/${id}/password`, { password });
  }

  // ── Backup / Restore ─────────────────────────────────────────────────────
  downloadBackup(): Observable<Blob> {
    return this.http.get(`${this.adminApi}/backup`, { responseType: 'blob' });
  }

  restoreBackup(file: File): Observable<{ ok: boolean; message: string }> {
    const form = new FormData();
    form.append('backup', file);
    return this.http.post<{ ok: boolean; message: string }>(`${this.adminApi}/restore`, form);
  }
}
