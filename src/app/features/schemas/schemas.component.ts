import { Component, Input } from '@angular/core';

import {
  type AdminEndpointDraft,
  type AdminSchemaItem,
  type AdminView,
} from '../../shared/models/portal.models';

export interface SchemasVm {
  notice: string | null;
  clearNotice: () => void;
  filteredSchemas: AdminSchemaItem[];
  selectedSchema: AdminSchemaItem | null;
  schemaWizardOpen: () => boolean;
  schemaWizardStep: () => 1 | 2 | 3;
  schemaVisibilityFilter: () => 'ALL' | 'PUBLICO' | 'PRIVADO';
  schemaVersionFilter: () => string;
  schemaVersionOptions: string[];
  schemaCountById: (schemaId: number) => number;
  formatDate: (value?: string) => string;
  setVisibilityFilter: (value: 'ALL' | 'PUBLICO' | 'PRIVADO') => void;
  setVersionFilter: (value: string) => void;
  setAdminView: (view: AdminView) => void;
  startCreateSchema: () => void;
  closeSchemaWizard: () => void;
  goToSchemaWizardStep: (step: 1 | 2 | 3) => void;
  previousAdminSchemaWizardStep: () => void;
  nextAdminSchemaWizardStep: () => void;
  continueSchemaWizardFromSource: () => Promise<void>;
  draftEndpoints: AdminEndpointDraft[];
  updateDraftEndpointField: (index: number, field: 'summary' | 'description' | 'operationId', value: string) => void;
  updateDraftEndpointStatus: (index: number, value: string) => void;
  updateDraftEndpointTags: (index: number, value: string) => void;
  updateDraftEndpointDeprecated: (index: number, value: boolean) => void;
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
  schemaSourceFormat: () => string;
  importUrl: () => string;
  importPreviewText: string;
  extractPreview: () => unknown | null;
  jsonPreview: (value: unknown) => string;
  updateImportUrl: (value: string) => void;
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
