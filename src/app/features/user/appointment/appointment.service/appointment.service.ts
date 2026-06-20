import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PatientRow } from '../../service/pacientes.service';

export interface AppointmentPayload {
  pacienteId: number;
  usuarioId?: number | null;
  fecha: string;
  hora: string;
  motivo: string;
  estado: string;
  tipoAtencion?: string;
}

export interface AppointmentRow {
  id: number;
  hora: string;
  fecha: string;
  fechaISO?: string;
  pacienteId?: number;
  pacienteNombre: string;
  profesional: string;
  motivo: string;
  tipoAtencion: string;
  estado: string;
  tienePendientes?: boolean;
}

export interface AppointmentStats {
  citasHoy: number;
  confirmadas: number;
  canceladas: number;
}

export interface UpcomingAppointment {
  id: number;
  hora: string;
  pacienteNombre: string;
  motivo: string;
  profesional: string;
  estado: string;
}

export interface AgendaSummary {
  primerTurno: string;
  ultimoTurno: string;
  espaciosDisponibles: number;
}

export interface PaginaMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CitaFilters {
  estado?: string;
  tipoAtencion?: string;
  pacienteId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  pageSize?: number;
}

export interface ClinicalStaffRow {
  id: number;
  nombreCompleto: string;
  rol: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private api = `${environment.apiUrl}/citas`;
  private authApi = `${environment.apiUrl}/auth`;
  private patientsApi = `${environment.apiUrl}/pacientes`;


  constructor(private http: HttpClient) {}

  createAppointment(payload: AppointmentPayload): Observable<{ ok: boolean; message?: string }> {
    return this.http.post<{ ok: boolean; message?: string }>(this.api, payload);
  }

  getAppointments(filters?: CitaFilters): Observable<{ ok: boolean; data: AppointmentRow[]; meta?: PaginaMeta }> {
    let params = new HttpParams();
    if (filters?.estado)     params = params.set('estado', filters.estado);
    if (filters?.tipoAtencion) params = params.set('tipoAtencion', filters.tipoAtencion);
    if (filters?.pacienteId) params = params.set('pacienteId', filters.pacienteId.toString());
    if (filters?.fechaDesde) params = params.set('fechaDesde', filters.fechaDesde);
    if (filters?.fechaHasta) params = params.set('fechaHasta', filters.fechaHasta);
    if (filters?.page)       params = params.set('page', filters.page.toString());
    if (filters?.pageSize)   params = params.set('pageSize', filters.pageSize.toString());
    return this.http.get<{ ok: boolean; data: AppointmentRow[]; meta?: PaginaMeta }>(this.api, { params });
  }

  getStats(): Observable<{ ok: boolean; data: AppointmentStats }> {
    return this.http.get<{ ok: boolean; data: AppointmentStats }>(`${this.api}/stats`);
  }

  getUpcoming(): Observable<{ ok: boolean; data: UpcomingAppointment[] }> {
    return this.http.get<{ ok: boolean; data: UpcomingAppointment[] }>(`${this.api}/upcoming`);
  }

  getSummary(): Observable<{ ok: boolean; data: AgendaSummary }> {
    return this.http.get<{ ok: boolean; data: AgendaSummary }>(`${this.api}/summary`);
  }

  getPatients(): Observable<{ ok: boolean; data: PatientRow[] }> {
    return this.http.get<{ ok: boolean; data: PatientRow[] }>(`${this.patientsApi}?soloActivos=true`);
  }

  getClinicalStaff(): Observable<{ ok: boolean; data: ClinicalStaffRow[] }> {
    return this.http.get<{ ok: boolean; data: ClinicalStaffRow[] }>(`${this.authApi}/clinical-staff`);
  }

  updateEstado(id: number, estado: string, cancelarMovimientos = false): Observable<{ ok: boolean; message?: string }> {
    return this.http.patch<{ ok: boolean; message?: string }>(`${this.api}/${id}/estado`, { estado, cancelarMovimientos });
  }
}