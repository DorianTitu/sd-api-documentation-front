import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AuthUser } from '../../shared/models/portal.models';
import { STORAGE_TOKEN_KEY, STORAGE_TOKEN_TYPE_KEY, STORAGE_USER_KEY } from '../constants/storage-keys';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<{ token: string; tokenType: string; user: AuthUser }> {
    const response = await this.api.post<any>('/auth/login', { email, password });

    if (!response.data) {
      throw new Error(response.message ?? 'Authentication failed');
    }

    // The backend returns the user data directly
    const userData = response.data;
    
    // Store the session
    this.persistSession(userData);

    return { 
      token: userData.token || '', 
      tokenType: 'Bearer', 
      user: {
        id: userData.id,
        correo: userData.email,
        nombre: userData.name,
        tipoUsuario: userData.tipoUsuario || 'DESARROLLADOR'
      }
    };
  }

  /**
   * Logout the user
   */
  async logout(): Promise<void> {
    try {
      await this.api.post<any>('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearSession();
    }
  }

  private persistSession(userData: any): void {
    // Store token if available
    if (userData.token) {
      localStorage.setItem(STORAGE_TOKEN_KEY, userData.token);
    }
    
    localStorage.setItem(STORAGE_TOKEN_TYPE_KEY, 'Bearer');
    
    // Store user info
    const user: AuthUser = {
      id: userData.id,
      correo: userData.email,
      nombre: userData.name,
      tipoUsuario: userData.tipoUsuario || 'DESARROLLADOR'
    };
    
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
