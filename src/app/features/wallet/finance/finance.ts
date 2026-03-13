import { Component } from '@angular/core';
import { Footer } from "../../complements/footer/footer";
import { Navbar } from "../../complements/navbar/navbar";

@Component({
  selector: 'app-finance',
  imports: [Footer, Navbar],
  templateUrl: './finance.html',
  styleUrl: './finance.css',
})
export class Finance {

}
