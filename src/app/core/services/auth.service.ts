import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AuthUser } from '../../shared/models/portal.models';
import { STORAGE_USER_KEY } from '../constants/storage-keys';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  /**
   * Login with email and password
   * Backend responds with HTTP-only cookie, not JWT
   */
  async login(email: string, password: string): Promise<AuthUser> {
    // Step 1: Send login request (credentials: 'include' is handled by ApiService)
    await this.api.post<any>('/auth/login', { email, password });

    // Step 2: Fetch user info from /auth/me
    const userData = await this.getAuthenticatedUser();
    
    // Step 3: Store user in state
    this.persistUser(userData);
    
    return userData;
  }

  /**
   * Get current authenticated user
   * Used to verify session is active and get user details
   */
  async getAuthenticatedUser(): Promise<AuthUser> {
    const response = await this.api.get<any>('/auth/me');
    
    return {
      id: response.id,
      correo: response.email,
      nombre: response.name,
      tipoUsuario: response.tipoUsuario || 'DESARROLLADOR'
    };
  }

  /**
   * Logout the user
   * Clears the HTTP-only cookie on backend
   */
  async logout(): Promise<void> {
    try {
      await this.api.post<any>('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearUser();
    }
  }

  /**
   * Check if user is authenticated
   * Returns true if we can fetch /auth/me successfully
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.getAuthenticatedUser();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get stored user from localStorage
   * Used after app startup to restore session state
   */
  getStoredUser(): AuthUser | null {
    const userRaw = localStorage.getItem(STORAGE_USER_KEY);
    if (!userRaw) {
      return null;
    }

    try {
      return JSON.parse(userRaw) as AuthUser;
    } catch {
      return null;
    }
  }

  /**
   * Persist user to localStorage
   */
  private persistUser(user: AuthUser): void {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  }

  /**
   * Clear user from localStorage
   */
  private clearUser(): void {
    localStorage.removeItem(STORAGE_USER_KEY);
  }
}
