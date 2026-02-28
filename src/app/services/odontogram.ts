import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Odontogram {
  patientId: number;
  date: string;
  teeth: any[];
}

@Injectable({
  providedIn: 'root'
})
export class OdontogramService {

  private apiUrl = 'http://localhost:3000/odontograma';

  constructor(private http: HttpClient) {}

  getActive(patientId: number): Observable<Odontogram> {
    return this.http.get<Odontogram>(`${this.apiUrl}/${patientId}`);
  }

  create(data: Odontogram): Observable<Odontogram> {
    return this.http.post<Odontogram>(this.apiUrl, data);
  }

  update(patientId: number, data: Odontogram): Observable<Odontogram> {
    return this.http.put<Odontogram>(`${this.apiUrl}/${patientId}`, data);
  }
}