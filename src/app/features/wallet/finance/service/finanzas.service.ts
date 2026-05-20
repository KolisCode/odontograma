import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface PagoMovimiento {
  id: number;
  movimientoId: number;
  monto: number;
  fecha: string;
  metodoPago: string | null;
  createdAt: string;
}

export interface PagoPayload {
  monto: number;
  fecha: string;
  metodoPago?: string | null;
}

export interface MovimientoPayload {
  tipo: string;
  concepto: string;
  monto: number;
  fecha: string;
  estado?: string;
  metodoPago?: string | null;
  diagnosticoRef?: string | null;
  pacienteId?: number | null;
  odontogramaId?: number | null;
}

export interface MovimientoRow {
  id: number;
  tipo: 'INGRESO' | 'EGRESO';
  concepto: string;
  monto: number;
  fecha: string;
  estado: 'PENDIENTE' | 'PAGADO' | 'CANCELADO';
  metodoPago: string | null;
  diagnosticoRef: string | null;
  nota: string | null;
  paciente: { id: number; nombre: string; apellido: string } | null;
  pagos: PagoMovimiento[];
  createdAt: string;
}

export interface MovimientoFilters {
  tipo?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  pacienteId?: number;
  sinPaciente?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FinanzasService {
  private api = `${environment.apiUrl}/finanzas`;

  constructor(private http: HttpClient) {}

  getAll(filters?: MovimientoFilters): Observable<{ ok: boolean; data: MovimientoRow[] }> {
    let params = new HttpParams();
    if (filters?.tipo) params = params.set('tipo', filters.tipo);
    if (filters?.estado) params = params.set('estado', filters.estado);
    if (filters?.fechaDesde) params = params.set('fechaDesde', filters.fechaDesde);
    if (filters?.fechaHasta) params = params.set('fechaHasta', filters.fechaHasta);
    if (filters?.pacienteId) params = params.set('pacienteId', filters.pacienteId.toString());
    if (filters?.sinPaciente) params = params.set('sinPaciente', 'true');
    return this.http.get<{ ok: boolean; data: MovimientoRow[] }>(this.api, { params });
  }

  create(payload: MovimientoPayload): Observable<{ ok: boolean; data: MovimientoRow }> {
    return this.http.post<{ ok: boolean; data: MovimientoRow }>(this.api, payload);
  }

  update(id: number, payload: Partial<MovimientoPayload>): Observable<{ ok: boolean; data: MovimientoRow }> {
    return this.http.put<{ ok: boolean; data: MovimientoRow }>(`${this.api}/${id}`, payload);
  }

  getByOdontograma(odontogramaId: number): Observable<{ ok: boolean; data: MovimientoRow[] }> {
    return this.http.get<{ ok: boolean; data: MovimientoRow[] }>(
      `${this.api}/odontograma/${odontogramaId}`,
    );
  }

  delete(id: number): Observable<{ ok: boolean; message: string }> {
    return this.http.delete<{ ok: boolean; message: string }>(`${this.api}/${id}`);
  }

  createPago(movimientoId: number, payload: PagoPayload): Observable<{ ok: boolean; data: MovimientoRow }> {
    return this.http.post<{ ok: boolean; data: MovimientoRow }>(
      `${this.api}/${movimientoId}/pagos`,
      payload,
    );
  }

  deletePago(movimientoId: number, pagoId: number): Observable<{ ok: boolean; data: MovimientoRow }> {
    return this.http.delete<{ ok: boolean; data: MovimientoRow }>(
      `${this.api}/${movimientoId}/pagos/${pagoId}`,
    );
  }
}
