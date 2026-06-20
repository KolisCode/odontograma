import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NotificacionManual {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: 'PERSONAL' | 'GLOBAL';
  leida: boolean;
  usuarioId: number | null;
  creadoPor: number | null;
  creadorNombre: string | null;
  programadaPara: string | null;
  createdAt: string;
}

export interface NotificacionAuto {
  clave: string;
  categoria: 'CITA' | 'PAGO';
  titulo: string;
  mensaje: string;
}

export interface NotificacionesData {
  manuales: NotificacionManual[];
  auto: NotificacionAuto[];
  proximas: NotificacionManual[];
  hayMasManuales: boolean;
  totalNoLeidas: number;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private api = `${environment.apiUrl}/notificaciones`;

  constructor(private http: HttpClient) {}

  getAll(manualesSkip = 0): Observable<{ ok: boolean; data: NotificacionesData }> {
    const url = manualesSkip > 0 ? `${this.api}?manualesSkip=${manualesSkip}` : this.api;
    return this.http.get<{ ok: boolean; data: NotificacionesData }>(url);
  }

  create(data: { titulo: string; mensaje: string; tipo: 'PERSONAL' | 'GLOBAL'; destinatarioId?: number; programadaPara?: string | null }): Observable<{ ok: boolean; message?: string }> {
    return this.http.post<{ ok: boolean; message?: string }>(this.api, data);
  }

  marcarLeida(id: number): Observable<{ ok: boolean; message?: string }> {
    return this.http.patch<{ ok: boolean; message?: string }>(`${this.api}/${id}/leer`, {});
  }

  eliminar(id: number): Observable<{ ok: boolean; message?: string }> {
    return this.http.delete<{ ok: boolean; message?: string }>(`${this.api}/${id}`);
  }

  descartar(clave: string): Observable<{ ok: boolean; message?: string }> {
    return this.http.post<{ ok: boolean; message?: string }>(`${this.api}/descartar`, { clave });
  }
}
