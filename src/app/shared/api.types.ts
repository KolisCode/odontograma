// Tipos compartidos para las respuestas del backend Biodont.
// El backend responde con la forma { ok, message?, data? }.

export interface ApiResponse<T = unknown> {
  ok: boolean;
  message?: string;
  data?: T;
}

// Usuario autenticado tal como se guarda en localStorage / devuelve /auth/me.
export interface AuthUser {
  id: number;
  nombre: string;
  apellido?: string;
  correo?: string;
  rol: string;
  telefono?: string;
  documento?: string;
  activo?: boolean;
  createdAt?: string;
}
