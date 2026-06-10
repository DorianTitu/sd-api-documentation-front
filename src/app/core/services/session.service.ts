import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { type ApiResponse, type AuthUser, type LoginData } from '../../shared/models/portal.models';
import {
  STORAGE_TOKEN_KEY,
  STORAGE_TOKEN_TYPE_KEY,
  STORAGE_USER_KEY,
} from '../constants/storage-keys';

export interface LoginCredentials {
  correo: string;
  clave: string;
}

export interface RegistrationData {
  correo: string;
  clave: string;
  nombre: string;
  tipoUsuario: 'ADMINISTRADOR' | 'DESARROLLADOR';
}

export interface SessionData {
  token: string;
  tokenType: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(ApiService);

  /**
   * Attempt to restore session from localStorage
   */
  async restoreSession(): Promise<SessionData | null> {
    const stored = this.getStoredSession();
    if (stored && stored.user) {
      return {
        token: stored.token,
        tokenType: localStorage.getItem(STORAGE_TOKEN_TYPE_KEY) || 'Bearer',
        user: stored.user,
      };
    }
    return null;
  }

  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<SessionData> {
    const response = await this.api.post<ApiResponse<LoginData>>('/auth/login', credentials);

    if (!response.success || !response.data) {
      throw new Error(response.message ?? 'Authentication failed');
    }

    const { accessToken, tokenType, usuario } = response.data;
    this.persistSession(accessToken, tokenType, usuario);

    return {
      token: accessToken,
      tokenType,
      user: usuario,
    };
  }

  /**
   * Register a new user
   */
  async register(data: RegistrationData): Promise<AuthUser> {
    const response = await this.api.post<any>('/auth/registro', data);

    // Handle different response formats
    const userData = response.data?.usuario || response.data?.user || response.data;

    if (!userData) {
      throw new Error(response.message ?? 'Failed to register user - no user data in response');
    }

    return userData as AuthUser;
  }

  /**
   * Logout and clear session
   */
  logout(): void {
    this.clearSession();
  }

  /**
   * Check if user has an active session
   */
  hasActiveSession(): boolean {
    return this.getStoredSession() !== null;
  }

  /**
   * Get current stored session
   */
  private getStoredSession(): { token: string; user: AuthUser | null } | null {
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

  /**
   * Persist session to storage
   */
  private persistSession(token: string, tokenType: string, user: AuthUser): void {
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    localStorage.setItem(STORAGE_TOKEN_TYPE_KEY, tokenType || 'Bearer');
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  }

  /**
   * Clear session from storage
   */
  private clearSession(): void {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_TOKEN_TYPE_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
  }
}
