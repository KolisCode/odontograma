import { Routes } from '@angular/router';
import { OdontogramComponent } from './features/odontogram/odontogram/odontogram';
import { Login } from './features/authentication/login/login';

export const routes: Routes = [
    { path: 'odontogram', component: OdontogramComponent},
    { path: '', component: Login},
];
