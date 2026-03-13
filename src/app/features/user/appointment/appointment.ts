import { Component } from '@angular/core';
import { Footer } from "../../complements/footer/footer";
import { Navbar } from "../../complements/navbar/navbar";

@Component({
  selector: 'app-appointment',
  imports: [ Footer, Navbar],
  templateUrl: './appointment.html',
  styleUrl: './appointment.css',
})
export class Appointment {

}
