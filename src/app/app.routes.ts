import { Routes } from '@angular/router';
import { OdontogramComponent } from './features/odontogram/odontogram/odontogram';
import { Login } from './features/authentication/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Finance } from './features/wallet/finance/finance';
import { List } from './features/user/list/list';
import { Appointment } from './features/user/appointment/appointment';
import { HistoriaClinica } from './features/historia-clinica/historia-clinica';
import { ResumenHistoria } from './features/historia-clinica/resumen/resumen';
import { Tratamientos } from './features/tratamientos/tratamientos';
import { Admin } from './features/admin/admin';
import { Perfil } from './features/perfil/perfil';
import { authGuard } from './features/authentication/service/auth-guard/auth-guard';
import { adminGuard } from './features/authentication/service/auth-guard/admin-guard';
import { guestGuard } from './features/authentication/service/auth-guard/guest-guard';

export const routes: Routes = [
  { path: '', component: Login, canActivate: [guestGuard] },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'finance', component: Finance, canActivate: [authGuard] },
  { path: 'patients', component: List, canActivate: [authGuard] },
  { path: 'appointments', component: Appointment, canActivate: [authGuard] },
  { path: 'admin', component: Admin, canActivate: [adminGuard] },
  { path: 'perfil', component: Perfil, canActivate: [authGuard] },
  { path: 'odontogram/:id', component: OdontogramComponent, canActivate: [authGuard] },
  { path: 'history/:id', component: HistoriaClinica, canActivate: [authGuard] },
  { path: 'resumen/:id', component: ResumenHistoria, canActivate: [authGuard] },
  { path: 'tratamientos/:id', component: Tratamientos, canActivate: [authGuard] },
  { path: '**', redirectTo: '/login' },
];
