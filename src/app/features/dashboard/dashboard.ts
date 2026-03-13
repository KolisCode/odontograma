import { Component } from '@angular/core';
import { Navbar } from "../complements/navbar/navbar";
import { Footer } from '../complements/footer/footer';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-dashboard',
  imports: [Navbar, Footer, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {

}
