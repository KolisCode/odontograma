export interface BackendOdontogramResponse {
  id: number;
  pacienteId: number;
  fecha: string;
  version: number;
  activo: boolean;
  dientes: BackendOdontogramTooth[];
}

export interface BackendOdontogramTooth {
  id: number;
  numero: number;
  odontogramaId: number;
  superficies: BackendOdontogramSurface[];
}

export interface BackendOdontogramSurface {
  id: number;
  superficie: string;
  diagnostico: string;
  dienteId: number;
}