import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../authentication/service/auth-service/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  @Input() patientName: string = 'Paciente Demo';
  constructor(private authService: AuthService) {}

  logout() {
    this.authService.logout();
  }
}
