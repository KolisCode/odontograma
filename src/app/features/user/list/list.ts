import { Component } from '@angular/core';
import { Footer } from "../../complements/footer/footer";
import { Navbar } from "../../complements/navbar/navbar";

@Component({
  selector: 'app-list',
  imports: [Footer, Navbar],
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class List {

}
