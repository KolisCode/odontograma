import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

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

export interface CitaFilters {
  estado?: string;
  tipoAtencion?: string;
  pacienteId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private api = 'http://localhost:3000/citas';
  private authApi = 'http://localhost:3000/auth';
  private patientsApi = 'http://localhost:3000/pacientes';
  // private api = '/api/citas';
  // private authApi = '/api/auth';
  // private patientsApi = '/api/pacientes';


  constructor(private http: HttpClient) {}

  createAppointment(payload: AppointmentPayload): Observable<any> {
    return this.http.post(this.api, payload);
  }

  getAppointments(filters?: CitaFilters): Observable<{ ok: boolean; data: AppointmentRow[] }> {
    let params = new HttpParams();
    if (filters?.estado) params = params.set('estado', filters.estado);
    if (filters?.tipoAtencion) params = params.set('tipoAtencion', filters.tipoAtencion);
    if (filters?.pacienteId) params = params.set('pacienteId', filters.pacienteId.toString());
    if (filters?.fechaDesde) params = params.set('fechaDesde', filters.fechaDesde);
    if (filters?.fechaHasta) params = params.set('fechaHasta', filters.fechaHasta);
    return this.http.get<{ ok: boolean; data: AppointmentRow[] }>(this.api, { params });
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

  getPatients(): Observable<any> {
    return this.http.get(this.patientsApi);
  }

  getClinicalStaff(): Observable<any> {
    return this.http.get(`${this.authApi}/clinical-staff`);
  }

  updateEstado(id: number, estado: string): Observable<any> {
    return this.http.patch(`${this.api}/${id}/estado`, { estado });
  }
}