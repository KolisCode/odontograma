import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface RegisterPayload {
  nombre: string;
  correo: string;
  rol: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  
  private apiUrl = 'http://localhost:3000/auth';

  constructor(private http: HttpClient) {}

  register(data: RegisterPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data)
      .pipe(
        tap((response: any) => {
          if(response?.data?.token){
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        })
      );
  }

  logout(){
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken(){
    return localStorage.getItem('token');
  }

  isLogged(){
    return !!localStorage.getItem('token');
  }

}
