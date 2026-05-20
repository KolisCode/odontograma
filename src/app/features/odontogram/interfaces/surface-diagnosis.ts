import { ToothSurface } from '../types/tooth-surface';
import { DiagnosisType } from '../types/diagnosis-type';

export interface SurfaceDiagnosis {
  surface: ToothSurface;
  diagnoses: DiagnosisType[];
}