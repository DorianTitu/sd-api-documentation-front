import { Component, Input } from '@angular/core';

import { type AdminView } from '../../shared/models/portal.models';

export interface OpenApiImportVm {
  notice: string | null;
  loading: () => boolean;
  importUrl: string;
  importPreviewText: string;
  extractPreview: unknown | null;
  updateImportUrl: (value: string) => void;
  extractSchema: () => void;
  createFromPreview: () => void;
  setAdminView: (view: AdminView) => void;
  jsonPreview: (value: unknown | null) => string;
}

@Component({
  selector: 'app-openapi-import',
  standalone: true,
  templateUrl: './openapi-import.component.html',
  styleUrl: './openapi-import.component.scss',
})
export class OpenapiImportComponent {
  @Input({ required: true }) vm!: OpenApiImportVm;
}
