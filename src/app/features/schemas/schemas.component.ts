import { Component, Input } from '@angular/core';

import {
  type AdminSchemaItem,
  type AdminView,
} from '../../shared/models/portal.models';

export interface SchemasVm {
  notice: string | null;
  clearNotice: () => void;
  filteredSchemas: AdminSchemaItem[];
  selectedSchema: AdminSchemaItem | null;
  schemaVisibilityFilter: () => 'ALL' | 'PUBLICO' | 'PRIVADO';
  schemaVersionFilter: () => string;
  schemaVersionOptions: string[];
  schemaCountById: (schemaId: number) => number;
  formatDate: (value?: string) => string;
  setVisibilityFilter: (value: 'ALL' | 'PUBLICO' | 'PRIVADO') => void;
  setVersionFilter: (value: string) => void;
  setAdminView: (view: AdminView) => void;
  startCreateSchema: () => void;
  loadAdminWorkspace: () => void;
  selectSchema: (schemaId: number) => void;
  deleteSchema: (schemaId: number) => void;
  saveSchema: () => void;
  resetSchema: () => void;
  updateSchemaField: (field: 'sourceUrl' | 'title' | 'description' | 'version', value: string) => void;
  updateSchemaVisibility: (value: string) => void;
  updateSchemaRaw: (value: string) => void;
  schemaFormMode: () => 'create' | 'edit';
  schemaSourceUrl: () => string;
  schemaTitle: () => string;
  schemaDescription: () => string;
  schemaVersion: () => string;
  schemaVisibility: () => 'PUBLICO' | 'PRIVADO';
  schemaRaw: () => string;
  loading: () => boolean;
}

@Component({
  selector: 'app-schemas',
  standalone: true,
  templateUrl: './schemas.component.html',
  styleUrl: './schemas.component.scss',
})
export class SchemasComponent {
  @Input({ required: true }) vm!: SchemasVm;
}
