import { Tooth } from "./tooth";

export interface CreateOdontogramDTO {
  patientId: number;
  date: string;
  teeth: Tooth[];
}