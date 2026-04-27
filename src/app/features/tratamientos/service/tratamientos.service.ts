import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TratamientoPayload {
  pacienteId: number;
  descripcion: string;
  estado?: string;
  monto?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  usuarioId?: number | null;
  odontogramaId?: number | null;
}

export interface TratamientoRow {
  id: number;
  descripcion: string;
  estado: 'ACTIVO' | 'FINALIZADO' | 'PAUSADO';
  monto: number | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  createdAt: string;
  updatedAt: string;
  paciente: { id: number; nombre: string; apellido: string; documento: string };
  usuario: { id: number; nombre: string; apellido: string; rol: string } | null;
  odontograma: { id: number; version: number; fecha: string } | null;
}

@Injectable({ providedIn: 'root' })
export class TratamientosService {
  private api = `${environment.apiUrl}/tratamientos`;

  constructor(private http: HttpClient) {}

  getByPaciente(pacienteId: number): Observable<{ ok: boolean; data: TratamientoRow[] }> {
    return this.http.get<{ ok: boolean; data: TratamientoRow[] }>(`${this.api}/paciente/${pacienteId}`);
  }

  create(payload: TratamientoPayload): Observable<{ ok: boolean; data: TratamientoRow }> {
    return this.http.post<{ ok: boolean; data: TratamientoRow }>(this.api, payload);
  }

  update(id: number, data: Partial<TratamientoPayload>): Observable<{ ok: boolean; data: TratamientoRow }> {
    return this.http.patch<{ ok: boolean; data: TratamientoRow }>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<{ ok: boolean; message: string }> {
    return this.http.delete<{ ok: boolean; message: string }>(`${this.api}/${id}`);
  }
}
