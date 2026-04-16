import { Routes } from '@angular/router';
import { OdontogramComponent } from './features/odontogram/odontogram/odontogram';
import { Login } from './features/authentication/login/login';
import { Register } from './features/authentication/register/register';
import { Dashboard } from './features/dashboard/dashboard';
import { Finance } from './features/wallet/finance/finance';
import { List } from './features/user/list/list';
import { Appointment } from './features/user/appointment/appointment';
import { HistoriaClinica } from './features/historia-clinica/historia-clinica';
import { Tratamientos } from './features/tratamientos/tratamientos';
import { authGuard } from './features/authentication/service/auth-guard/auth-guard';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'login', component: Login },
  { path: 'odontogram/:id', component: OdontogramComponent , canActivate: [authGuard] },
  { path: 'register', component: Register },
  { path: 'dashboard', component: Dashboard , canActivate: [authGuard] },
  { path: 'finance', component: Finance , canActivate: [authGuard] },
  { path: 'patients', component: List , canActivate: [authGuard] },
  { path: 'appointments', component: Appointment , canActivate: [authGuard] },
  { path: 'history/:id', component: HistoriaClinica , canActivate: [authGuard] },
  { path: 'tratamientos/:id', component: Tratamientos , canActivate: [authGuard] },
  { path: '**', component: Login },
];
