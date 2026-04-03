import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HistoriaClinicaPayload {
  pacienteId: number;
  numeroHistoria?: string;
  estadoCivil?: string;
  sexo?: string;
  ocupacion?: string;
  lugarResidencia?: string;
  acompananteNombre?: string;
  acompananteTelefono?: string;
  acompananteParentesco?: string;
  motivoConsulta?: string;
  enfermedadesSistemicas?: any;
  antecedentesQuirurgicos?: string;
  medicacionActual?: any;
  alergiasGenerales?: string;
  antecedentesHematologicos?: string;
  ginecoObstetricos?: string;
  habitos?: string;
  antecedentesOdontologicos?: string;
  higieneOral?: any;
  declaracionAceptada?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HistoriaClinicaService {
  private api = '/api/historias-clinicas';
  // private api = 'http://192.168.2.7:3000/historias-clinicas';


  constructor(private http: HttpClient) {}

  getHistoriaByPaciente(pacienteId: number): Observable<any> {
    return this.http.get(`${this.api}/paciente/${pacienteId}`);
  }

  saveHistoria(payload: HistoriaClinicaPayload): Observable<any> {
    return this.http.post(this.api, payload);
  }
}