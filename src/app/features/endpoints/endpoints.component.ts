import { Component, Input } from '@angular/core';

import { type AdminEndpointItem, type AdminSchemaItem, type AdminView } from '../../shared/models/portal.models';

export interface EndpointsVm {
  notice: string | null;
  clearNotice: () => void;
  filteredEndpoints: AdminEndpointItem[];
  selectedEndpoint: AdminEndpointItem | null;
  schemas: AdminSchemaItem[];
  formatDate: (value?: string) => string;
  setAdminView: (view: AdminView) => void;
  startCreateEndpoint: () => void;
  loadAdminWorkspace: () => void;
  selectEndpoint: (endpointId: number) => void;
  deleteEndpoint: (endpointId: number) => void;
  saveEndpoint: () => void;
  resetEndpoint: () => void;
  updateEndpointField: (
    field: 'schemaId' | 'path' | 'summary' | 'description' | 'operationId' | 'tags' | 'status',
    value: string,
  ) => void;
  updateEndpointMethod: (value: string) => void;
  updateEndpointDeprecated: (value: boolean) => void;
  updateEndpointParameters: (value: string) => void;
  updateEndpointRequestBody: (value: string) => void;
  updateEndpointResponses: (value: string) => void;
  endpointFormMode: () => 'create' | 'edit';
  endpointSchemaId: () => string;
  endpointPath: () => string;
  endpointMethod: () => string;
  endpointSummary: () => string;
  endpointDescription: () => string;
  endpointOperationId: () => string;
  endpointTags: () => string;
  endpointDeprecated: () => boolean;
  endpointStatus: () => string;
  endpointParametersText: () => string;
  endpointRequestBodyText: () => string;
  endpointResponsesText: () => string;
  loading: () => boolean;
}

@Component({
  selector: 'app-endpoints',
  standalone: true,
  templateUrl: './endpoints.component.html',
  styleUrl: './endpoints.component.scss',
})
export class EndpointsComponent {
  @Input({ required: true }) vm!: EndpointsVm;
}
