import { Tooth } from "./tooth";

export interface Odontogram {
  patientId: number;
  date: Date;
  teeth: Tooth[];
}