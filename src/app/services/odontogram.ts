import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OdontogramPayload } from '../features/odontogram/interfaces/odontogram-payload';
import { BackendOdontogramResponse } from '../features/odontogram/interfaces/backend-odontogram-response';

@Injectable({
  providedIn: 'root',
})
export class OdontogramService {
  // private apiUrl = '/api/odontograma';
  private apiUrl = 'http://localhost:3000/odontograma';


  constructor(private http: HttpClient) {}

  getActive(patientId: number): Observable<BackendOdontogramResponse | null> {
    return this.http.get<BackendOdontogramResponse | null>(`${this.apiUrl}/${patientId}`);
  }

  create(data: OdontogramPayload): Observable<BackendOdontogramResponse> {
    return this.http.post<BackendOdontogramResponse>(this.apiUrl, data);
  }

  update(id: number, data: OdontogramPayload): Observable<BackendOdontogramResponse> {
    return this.http.put<BackendOdontogramResponse>(`${this.apiUrl}/${id}`, data);
  }
}
