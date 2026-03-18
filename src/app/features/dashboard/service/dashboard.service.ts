import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardStats {
  pacientesRegistrados: number;
  pacientesNuevosMes: number;
  citasHoy: number;
  citasPendientesHoy: number;
  ingresosDia: number;
  tratamientosActivos: number;
}

export interface AgendaItem {
  id: number;
  hora: string;
  pacienteNombre: string;
  motivo: string;
  estado: string;
}

export interface DashboardSummaryResponse {
  ok: boolean;
  data: {
    stats: DashboardStats;
    agendaHoy: AgendaItem[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private api = 'http://192.168.2.7:3000/dashboard';
  //private api = '/api/dashboard';

  constructor(private http: HttpClient) {}

  getSummary(): Observable<DashboardSummaryResponse> {
    return this.http.get<DashboardSummaryResponse>(`${this.api}/summary`);
  }
}