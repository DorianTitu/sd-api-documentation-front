import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { type ApiResponse, type AuthUser } from '../../shared/models/portal.models';

export interface CreateUserRequest {
  correo: string;
  nombre: string;
  clave: string;
  tipoUsuario: 'ADMINISTRADOR' | 'DESARROLLADOR';
}

export interface UserResponse {
  id?: number;
  correo: string;
  nombre: string;
  tipoUsuario: 'ADMINISTRADOR' | 'DESARROLLADOR';
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly api = inject(ApiService);

  /**
   * Get all users
   */
  async getAllUsers(): Promise<UserResponse[]> {
    const response = await this.api.get<ApiResponse<UserResponse[]>>('/admin/usuarios');
    return response.data ?? [];
  }

  /**
   * Create a new user
   */
  async createUser(request: CreateUserRequest): Promise<UserResponse> {
    const response = await this.api.post<ApiResponse<UserResponse>>('/auth/registro', request);

    if (!response.data) {
      throw new Error(response.message ?? 'Failed to create user');
    }

    return response.data;
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: number): Promise<void> {
    await this.api.delete<ApiResponse<void>>(`/admin/usuarios/${userId}`);
  }

  /**
   * Search users by email or name
   */
  searchUsers(users: UserResponse[], query: string): UserResponse[] {
    if (!query.trim()) {
      return users;
    }

    const lowerQuery = query.toLowerCase();
    return users.filter(
      (user) =>
        user.correo.toLowerCase().includes(lowerQuery) ||
        user.nombre.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Filter users by type
   */
  filterUsersByType(users: UserResponse[], type: 'ALL' | 'ADMINISTRADOR' | 'DESARROLLADOR'): UserResponse[] {
    if (type === 'ALL') {
      return users;
    }
    return users.filter((user) => user.tipoUsuario === type);
  }
}
