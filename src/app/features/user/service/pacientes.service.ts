import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PaginaMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PatientPayload {
  nombre: string;
  apellido: string;
  documento: string;
  telefono?: string;
  correo?: string;
  fechaNacimiento?: string;
  direccion?: string;
  eps?: string;
  alergias?: string;
  observaciones?: string;
}

export interface PatientRow {
  id: number;
  nombreCompleto: string;
  documento: string;
  telefono: string | null;
  eps: string | null;
  activo: boolean;
  fechaNacimiento: string | null;
  ultimaCita: string;
}

export interface RecentPatient {
  id: number;
  nombreCompleto: string;
  documento: string;
  telefono: string;
}

export interface QuickInfo {
  alergiasRegistradas: number;
  pacientesNuevosMes: number;
  historiasPendientes: number;
}

export interface ImportError {
  fila: number;
  documento: string;
  motivo: string;
}

export interface ImportResult {
  importados: number;
  actualizados: number;
  errores: ImportError[];
}

@Injectable({
  providedIn: 'root'
})
export class PatientsService {
  private api = `${environment.apiUrl}/pacientes`

  constructor(private http: HttpClient) {}

  createPatient(payload: PatientPayload): Observable<any> {
    return this.http.post(this.api, payload);
  }

  getPatients(params: { soloActivos?: boolean; search?: string; page?: number; pageSize?: number } = {}): Observable<{ ok: boolean; data: PatientRow[]; meta?: PaginaMeta }> {
    let p = new HttpParams();
    if (params.soloActivos) p = p.set('soloActivos', 'true');
    if (params.search)      p = p.set('search', params.search);
    if (params.page)        p = p.set('page', params.page.toString());
    if (params.pageSize)    p = p.set('pageSize', params.pageSize.toString());
    return this.http.get<{ ok: boolean; data: PatientRow[]; meta?: PaginaMeta }>(this.api, { params: p });
  }

  getRecentPatients(): Observable<{ ok: boolean; data: RecentPatient[] }> {
    return this.http.get<{ ok: boolean; data: RecentPatient[] }>(`${this.api}/recent`);
  }

  getQuickInfo(): Observable<{ ok: boolean; data: QuickInfo }> {
    return this.http.get<{ ok: boolean; data: QuickInfo }>(`${this.api}/quick-info`);
  }

  getPatientById(id: number): Observable<any> {
    return this.http.get(`${this.api}/${id}`);
  }

  updatePatient(id: number, payload: PatientPayload): Observable<any> {
    return this.http.patch(`${this.api}/${id}`, payload);
  }

  importarPacientes(rows: PatientPayload[]): Observable<{ ok: boolean; data: ImportResult }> {
    return this.http.post<{ ok: boolean; data: ImportResult }>(`${this.api}/importar`, { rows });
  }

  toggleActivo(id: number, activo: boolean, force = false): Observable<any> {
    return this.http.patch(`${this.api}/${id}/activo`, { activo, force });
  }
}