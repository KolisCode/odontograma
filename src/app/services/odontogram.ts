import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OdontogramPayload } from '../features/odontogram/interfaces/odontogram-payload';
import { BackendOdontogramResponse } from '../features/odontogram/interfaces/backend-odontogram-response';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OdontogramService {
  private apiUrl = `${environment.apiUrl}/odontograma`;

  constructor(private http: HttpClient) {}

  getActive(patientId: number): Observable<BackendOdontogramResponse | null> {
    return this.http.get<BackendOdontogramResponse | null>(`${this.apiUrl}/${patientId}`);
  }

  getPlan(patientId: number): Observable<BackendOdontogramResponse | null> {
    return this.http.get<BackendOdontogramResponse | null>(`${this.apiUrl}/plan/${patientId}`);
  }

  getHistorial(patientId: number): Observable<BackendOdontogramResponse[]> {
    return this.http.get<BackendOdontogramResponse[]>(`${this.apiUrl}/historial/${patientId}`);
  }

  create(data: OdontogramPayload): Observable<BackendOdontogramResponse> {
    return this.http.post<BackendOdontogramResponse>(this.apiUrl, data);
  }

  /** Actualiza dientes en la versión activa sin crear versión nueva */
  patch(id: number, data: OdontogramPayload): Observable<BackendOdontogramResponse> {
    return this.http.patch<BackendOdontogramResponse>(`${this.apiUrl}/${id}`, data);
  }

  /** Archiva la versión actual y crea una nueva (versionar) */
  update(id: number, data: OdontogramPayload): Observable<BackendOdontogramResponse> {
    return this.http.put<BackendOdontogramResponse>(`${this.apiUrl}/${id}`, data);
  }
}
