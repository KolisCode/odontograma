import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, Input, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../authentication/service/auth-service/auth.service';
import { PatientsService, PatientRow } from '../../user/service/pacientes.service';

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

  patients: PatientRow[] = [];
  historiaDropdownOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private patientsService: PatientsService,
    private cdr: ChangeDetectorRef,
  ) {}

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    const user = this.authService.getUser();

    if (user) {
      const fullName = `${user.nombre || ''} ${user.apellido || ''}`.trim();
      this.userName = fullName || 'Usuario';
      this.userRole = this.formatRole(user.rol);
      this.avatarLetter = (user.nombre?.charAt(0) || 'U').toUpperCase();
    }

    this.patientsService.getPatients().subscribe({
      next: (res) => {
        this.patients = res.data;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  toggleHistoriaDropdown(): void {
    this.historiaDropdownOpen = !this.historiaDropdownOpen;
  }

  selectHistoriaPaciente(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id) {
      this.historiaDropdownOpen = false;
      this.router.navigate(['/history', id]);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.nav-historia-wrapper')) {
      this.historiaDropdownOpen = false;
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