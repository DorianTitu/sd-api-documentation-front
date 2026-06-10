import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ApiResponse, LoginData, AuthUser } from '../../shared/models/portal.models';
import { STORAGE_TOKEN_KEY, STORAGE_TOKEN_TYPE_KEY, STORAGE_USER_KEY } from '../constants/storage-keys';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  async login(correo: string, clave: string): Promise<{ token: string; tokenType: string; user: AuthUser }> {
    const response = await this.api.post<ApiResponse<LoginData>>('/auth/login', { correo, clave });

    if (!response.success || !response.data) {
      throw new Error(response.message ?? 'Authentication failed');
    }

    const { accessToken, tokenType, usuario } = response.data;
    this.persistSession(accessToken, tokenType, usuario);

    return { token: accessToken, tokenType, user: usuario };
  }

  logout(): void {
    this.clearSession();
  }

  async registerUser(correo: string, clave: string, nombre: string, tipoUsuario: 'ADMINISTRADOR' | 'DESARROLLADOR'): Promise<AuthUser> {
    try {
      const response = await this.api.post<any>('/auth/registro', {
        correo,
        clave,
        nombre,
        tipoUsuario
      });

      console.log('Registration response:', response);

      // Handle different response formats
      const userData = response.data?.usuario || response.data?.user || response.data;

      if (!userData) {
        throw new Error(response.message ?? 'Failed to register user - no user data in response');
      }

      return userData as AuthUser;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  private persistSession(token: string, tokenType: string, user: AuthUser): void {
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    localStorage.setItem(STORAGE_TOKEN_TYPE_KEY, tokenType || 'Bearer');
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  }

  private clearSession(): void {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_TOKEN_TYPE_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
  }

  getStoredSession(): { token: string; user: AuthUser | null } | null {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    const userRaw = localStorage.getItem(STORAGE_USER_KEY);

    if (!token || !userRaw) {
      return null;
    }

    try {
      const user = JSON.parse(userRaw) as AuthUser | null;
      return user ? { token, user } : null;
    } catch {
      return null;
    }
  }
}
