import { Component, Input } from '@angular/core';

import { type AdminAccessItem, type AdminSchemaItem, type AdminView } from '../../shared/models/portal.models';

export interface AccessControlVm {
  notice: string | null;
  filteredAccesses: AdminAccessItem[];
  selectedSchemaId: string;
  adminAccessSchemaId: string;
  adminAccessDeveloperUserId: string;
  schemas: AdminSchemaItem[];
  loading: () => boolean;
  setAdminView: (view: AdminView) => void;
  onSchemaChange: (value: string) => void;
  updateDeveloperUserId: (value: string) => void;
  grantAccess: () => void;
  revokeAccess: (developerUserId: number) => void;
}

@Component({
  selector: 'app-access-control',
  standalone: true,
  templateUrl: './access-control.component.html',
  styleUrl: './access-control.component.scss',
})
export class AccessControlComponent {
  @Input({ required: true }) vm!: AccessControlVm;
}
