import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../authentication/service/auth-service/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar implements OnInit {
  @Input() patientName: string = 'Paciente Demo';

  userName: string = 'Usuario';
  userRole: string = 'Sin rol';
  avatarLetter: string = 'U';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();

    if (user) {
      const fullName = `${user.nombre || ''} ${user.apellido || ''}`.trim();
      this.userName = fullName || 'Usuario';
      this.userRole = this.formatRole(user.rol);
      this.avatarLetter = (user.nombre?.charAt(0) || 'U').toUpperCase();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private formatRole(role: string): string {
    const normalized = String(role || '').toUpperCase();

    switch (normalized) {
      case 'ADMIN':
        return 'Administrador';
      case 'ODONTOLOGO':
        return 'Odontólogo';
      case 'AUXILIAR':
        return 'Auxiliar';
      case 'RECEPCION':
        return 'Recepción';
      default:
        return role || 'Sin rol';
    }
  }
}