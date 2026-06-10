import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { type AuthUser } from '../../shared/models/portal.models';

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

export interface UserResponse {
  id?: string | number;
  email: string;
  name: string;
  tipoUsuario?: 'ADMINISTRADOR' | 'DESARROLLADOR';
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly api = inject(ApiService);

  /**
   * Create a new user via registration endpoint
   */
  async createUser(request: CreateUserRequest): Promise<UserResponse> {
    const response = await this.api.post<any>('/auth/register', request);

    if (!response.data) {
      throw new Error(response.message ?? 'Failed to create user');
    }

    // Map backend response to our UserResponse format
    const data = response.data;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      tipoUsuario: data.tipoUsuario || 'DESARROLLADOR',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
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
        user.email.toLowerCase().includes(lowerQuery) ||
        user.name.toLowerCase().includes(lowerQuery)
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
