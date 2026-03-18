import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class PatientsService {
  private api = 'http://192.168.2.7:3000/pacientes'
  //private api = '/api/pacientes'

  constructor(private http: HttpClient) {}

  createPatient(payload: PatientPayload): Observable<any> {
    return this.http.post(this.api, payload);
  }

  getPatients(): Observable<{ ok: boolean; data: PatientRow[] }> {
    return this.http.get<{ ok: boolean; data: PatientRow[] }>(this.api);
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
}