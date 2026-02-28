import { DiagnosisType } from "../types/diagnosis-type";
import { ToothSurface } from "../types/tooth-surface";

export interface CreateOdontogramDTO {
  patientId: number;
  date: string;
  teeth: {
    number: number;
    surfaces: {
      surface: ToothSurface;
      diagnoses: DiagnosisType[];
    }[];
  }[];
}