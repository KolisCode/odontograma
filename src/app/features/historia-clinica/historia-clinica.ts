import { Component } from '@angular/core';
import { Navbar } from "../complements/navbar/navbar";
import { Footer } from "../complements/footer/footer";

@Component({
  selector: 'app-historia-clinica',
  imports: [Navbar, Footer],
  templateUrl: './historia-clinica.html',
  styleUrl: './historia-clinica.css',
})
export class HistoriaClinica {

}
