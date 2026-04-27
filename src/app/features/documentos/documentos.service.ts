import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocumentoUsuario {
  id: number;
  nombre: string;
  apellido: string;
  rol: string;
}

export interface Documento {
  id: number;
  pacienteId: number;
  usuarioId: number | null;
  nombre: string;
  tipo: DocumentoTipo;
  fecha: string | null;
  mimetype: string;
  tamanio: number;
  createdAt: string;
  usuario: DocumentoUsuario | null;
}

export type DocumentoTipo = 'RADIOGRAFIA' | 'CONSENTIMIENTO' | 'EXAMEN' | 'RECETA' | 'OTRO';

@Injectable({ providedIn: 'root' })
export class DocumentosService {
  private baseUrl = `${environment.apiUrl}/documentos`;

  constructor(private http: HttpClient) {}

  getByPaciente(pacienteId: number): Observable<{ data: Documento[] }> {
    return this.http.get<{ data: Documento[] }>(`${this.baseUrl}/paciente/${pacienteId}`);
  }

  upload(formData: FormData): Observable<{ data: Documento }> {
    return this.http.post<{ data: Documento }>(this.baseUrl, formData);
  }

  getArchivoBlob(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/archivo`, { responseType: 'blob' });
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}
