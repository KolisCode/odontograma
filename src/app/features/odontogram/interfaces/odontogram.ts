import { Tooth } from "./tooth";

export interface Odontogram {
  id?: number;
  patientId: number;
  date: string;
  teeth: Tooth[];
  version?: number;
}