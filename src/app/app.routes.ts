import { Routes } from '@angular/router';
import { OdontogramComponent } from './features/odontogram/odontogram/odontogram';
import { Login } from './features/authentication/login/login';
import { Register } from './features/authentication/register/register';
import { Dashboard } from './features/dashboard/dashboard';
import { Finance } from './features/wallet/finance/finance';
import { List } from './features/user/list/list';
import { Appointment } from './features/user/appointment/appointment';
import { HistoriaClinica } from './features/historia-clinica/historia-clinica';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'login', component: Login },
  { path: 'odontogram', component: OdontogramComponent },
  { path: 'register', component: Register },
  { path: 'dashboard', component: Dashboard },
  { path: 'finance', component: Finance },
  { path: 'patients', component: List },
  { path: 'appointments', component: Appointment },
  { path: 'history/:id', component: HistoriaClinica },
  { path: '**', component: Login },
];
