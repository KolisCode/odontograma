import { DiagnosisType } from "../types/diagnosis-type";
import { ToothSurface } from "../types/tooth-surface";

export interface SurfaceDiagnosis {
  surface: ToothSurface;
  diagnoses: DiagnosisType[];
}
