import { DiagnosisType } from '../types/diagnosis-type';
import { ToothSurface } from '../types/tooth-surface';

export interface Diagnosis {

  teeth: number[];

  faces: ToothSurface[];

  type: DiagnosisType;

  date: string;

}