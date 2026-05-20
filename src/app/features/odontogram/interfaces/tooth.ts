import { SurfaceDiagnosis } from "./surface-diagnosis";

export interface Tooth {
  number: number; // 11,12,13 etc
  surfaces: SurfaceDiagnosis[];
}