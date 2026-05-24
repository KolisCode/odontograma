import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

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
  enfermedadesOdontologicas?: string;
  higieneOral?: any;
  declaracionAceptada?: boolean;
}

export interface EvolucionRow {
  id: number;
  nota: string;
  createdAt: string;
  usuario: { nombre: string; apellido: string } | null;
}

export interface MedicamentoFormula {
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
}

export interface FormulaMedicaRow {
  id: number;
  diagnostico: string | null;
  medicamentos: MedicamentoFormula[];
  instrucciones: string | null;
  createdAt: string;
  usuario: { nombre: string; apellido: string } | null;
}

@Injectable({
  providedIn: 'root'
})
export class HistoriaClinicaService {
  private api = `${environment.apiUrl}/historias-clinicas`;


  constructor(private http: HttpClient) {}

  private evolucionesApi = `${environment.apiUrl}/evoluciones`;
  private formulasMedicasApi = `${environment.apiUrl}/formulas-medicas`;

  getHistoriaByPaciente(pacienteId: number): Observable<any> {
    return this.http.get(`${this.api}/paciente/${pacienteId}`);
  }

  saveHistoria(payload: HistoriaClinicaPayload): Observable<any> {
    return this.http.post(this.api, payload);
  }

  getEvoluciones(pacienteId: number): Observable<{ ok: boolean; data: EvolucionRow[] }> {
    return this.http.get<{ ok: boolean; data: EvolucionRow[] }>(`${this.evolucionesApi}/paciente/${pacienteId}`);
  }

  crearEvolucion(pacienteId: number, nota: string): Observable<{ ok: boolean; data: EvolucionRow }> {
    return this.http.post<{ ok: boolean; data: EvolucionRow }>(this.evolucionesApi, { pacienteId, nota });
  }

  eliminarEvolucion(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.evolucionesApi}/${id}`);
  }

  getFormulas(pacienteId: number): Observable<{ ok: boolean; data: FormulaMedicaRow[] }> {
    return this.http.get<{ ok: boolean; data: FormulaMedicaRow[] }>(`${this.formulasMedicasApi}/paciente/${pacienteId}`);
  }

  crearFormula(payload: {
    pacienteId: number;
    diagnostico: string;
    medicamentos: MedicamentoFormula[];
    instrucciones: string;
  }): Observable<{ ok: boolean; data: FormulaMedicaRow }> {
    return this.http.post<{ ok: boolean; data: FormulaMedicaRow }>(this.formulasMedicasApi, payload);
  }

  eliminarFormula(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.formulasMedicasApi}/${id}`);
  }
}