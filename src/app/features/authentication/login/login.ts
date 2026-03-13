import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Footer } from "../../complements/footer/footer";

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterLink, Footer],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  loginError = false;

  ngOnInit(): void {
    this.login();
  }
  login() {
    if (false) {
      this.loginError = true;
    }
  }
}