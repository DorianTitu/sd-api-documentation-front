import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { type UserResponse } from '../../core/services/user-management.service';

export interface AdminUsersVm {
  users: UserResponse[];
  loading: boolean;
  error: string | null;
  createUser: (email: string, name: string, password: string, type: string) => Promise<void>;
  deleteUser: (userId: number, userName: string) => Promise<void>;
  formatDate: (date?: string) => string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent {
  @Input() vm!: AdminUsersVm;

  protected searchQuery = '';
  protected filterType: 'ALL' | 'ADMINISTRADOR' | 'DESARROLLADOR' = 'ALL';
  protected showDeleteConfirm = false;
  protected userToDelete: { id: number; name: string } | null = null;

  protected get filteredUsers(): UserResponse[] {
    let result = this.vm.users;

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.correo.toLowerCase().includes(query) ||
          user.nombre.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (this.filterType !== 'ALL') {
      result = result.filter((user) => user.tipoUsuario === this.filterType);
    }

    return result;
  }

  protected async handleDeleteUser(userId: number, userName: string): Promise<void> {
    this.userToDelete = { id: userId, name: userName };
    this.showDeleteConfirm = true;
  }

  protected async confirmDelete(): Promise<void> {
    if (this.userToDelete) {
      await this.vm.deleteUser(this.userToDelete.id, this.userToDelete.name);
      this.showDeleteConfirm = false;
      this.userToDelete = null;
    }
  }

  protected cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.userToDelete = null;
  }
}
