import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { type PrivateSchemaWithAccesses } from '../../shared/models/portal.models';

export interface AdminAccessesVm {
  schemas: PrivateSchemaWithAccesses[];
  loading: boolean;
  error: string | null;
  grantAccess: (schemaId: string | number, developerUserId: string | number) => Promise<void>;
  revokeAccess: (schemaId: string | number, developerUserId: string | number) => Promise<void>;
  formatDate: (date: string | Date) => string;
}

@Component({
  selector: 'app-accesses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accesses.component.html',
  styleUrl: './accesses.component.scss',
})
export class AccessesComponent {
  @Input() vm!: AdminAccessesVm;

  protected expandedSchemaId: number | null = null;
  protected selectedDeveloperUserId = '';

  protected toggleSchemaAccesses(schemaId: number): void {
    this.expandedSchemaId = this.expandedSchemaId === schemaId ? null : schemaId;
  }

  protected async handleGrantAccess(schemaId: number): Promise<void> {
    if (!this.selectedDeveloperUserId.trim()) {
      return;
    }
    await this.vm.grantAccess(schemaId, this.selectedDeveloperUserId);
    this.selectedDeveloperUserId = '';
  }

  protected async handleRevokeAccess(schemaId: number, developerUserId: number): Promise<void> {
    await this.vm.revokeAccess(schemaId, developerUserId);
  }
}
