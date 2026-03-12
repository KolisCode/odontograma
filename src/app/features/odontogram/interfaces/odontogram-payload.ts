export interface OdontogramPayload {
  pacienteId: number;
  dientes: OdontogramPayloadTooth[];
}

export interface OdontogramPayloadTooth {
  numero: number;
  superficies: OdontogramPayloadSurface[];
}

export interface OdontogramPayloadSurface {
  superficie: string;
  diagnostico: string;
}