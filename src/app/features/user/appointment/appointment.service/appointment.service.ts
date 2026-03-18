import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private api = 'http://192.168.2.7:3000/citas';
  private authApi = 'http://192.168.2.7:3000/auth';
  private patientsApi = 'http://192.168.2.7:3000/pacientes';

  constructor(private http: HttpClient) {}

  createAppointment(payload: AppointmentPayload): Observable<any> {
    return this.http.post(this.api, payload);
  }

  getAppointments(): Observable<{ ok: boolean; data: AppointmentRow[] }> {
    return this.http.get<{ ok: boolean; data: AppointmentRow[] }>(this.api);
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
}