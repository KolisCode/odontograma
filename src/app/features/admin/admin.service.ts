import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExportData } from '../../services/export.service';

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

@Injectable({ providedIn: 'root' })
export class AdminService {
  private exportApi = 'http://localhost:3000/admin/exportar';
  private healthApi = 'http://localhost:3000/api/v1/health';

  constructor(private http: HttpClient) {}

  exportar(config: ExportConfig): Observable<{ ok: boolean; data: ExportData }> {
    return this.http.post<{ ok: boolean; data: ExportData }>(this.exportApi, config);
  }

  checkHealth(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(this.healthApi);
  }
}
