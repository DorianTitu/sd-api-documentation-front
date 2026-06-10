import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  type AdminEndpointItem,
  type ApiResponse,
  type AdminEndpointDraft,
  type DocumentedEndpoint,
} from '../../shared/models/portal.models';

@Injectable({ providedIn: 'root' })
export class EndpointFacadeService {
  private readonly api = inject(ApiService);

  /**
   * Get all admin endpoints
   */
  async getAdminEndpoints(): Promise<AdminEndpointItem[]> {
    const response = await this.api.get<ApiResponse<AdminEndpointItem[]>>('/admin/endpoints');
    return response.data ?? [];
  }

  /**
   * Get endpoints for a specific schema
   */
  async getEndpointsBySchema(schemaId: number): Promise<AdminEndpointItem[]> {
    const allEndpoints = await this.getAdminEndpoints();
    return allEndpoints.filter((e) => e.schemaId === schemaId);
  }

  /**
   * Get public schema endpoints
   */
  async getPublicSchemaEndpoints(schemaId: number | string): Promise<DocumentedEndpoint[]> {
    const response = await this.api.get<ApiResponse<DocumentedEndpoint[]>>(`/schemas/${schemaId}/endpoints`);
    return response.data ?? [];
  }

  /**
   * Create a new endpoint
   */
  async createEndpoint(request: {
    schemaId: number;
    method: string;
    path: string;
    summary?: string;
    description?: string;
    operationId?: string;
    tags?: string[];
    deprecated?: boolean;
    status: 'VISIBLE' | 'OCULTO' | 'PENDIENTE_ACTUALIZACION' | 'PENDIENTE_DOCUMENTACION';
    parameters?: DocumentedEndpoint['parameters'];
    requestBody?: DocumentedEndpoint['requestBody'];
    responses?: DocumentedEndpoint['responses'];
  }): Promise<AdminEndpointItem> {
    const response = await this.api.post<ApiResponse<AdminEndpointItem>>('/admin/endpoints', request);

    if (!response.data) {
      throw new Error(response.message ?? 'Failed to create endpoint');
    }

    return response.data;
  }

  /**
   * Update an existing endpoint
   */
  async updateEndpoint(
    endpointId: number,
    request: {
      schemaId: number;
      method: string;
      path: string;
      summary?: string;
      description?: string;
      operationId?: string;
      tags?: string[];
      deprecated?: boolean;
      status: 'VISIBLE' | 'OCULTO' | 'PENDIENTE_ACTUALIZACION' | 'PENDIENTE_DOCUMENTACION';
      parameters?: DocumentedEndpoint['parameters'];
      requestBody?: DocumentedEndpoint['requestBody'];
      responses?: DocumentedEndpoint['responses'];
    }
  ): Promise<AdminEndpointItem> {
    const response = await this.api.put<ApiResponse<AdminEndpointItem>>(`/admin/endpoints/${endpointId}`, request);

    if (!response.data) {
      throw new Error(response.message ?? 'Failed to update endpoint');
    }

    return response.data;
  }

  /**
   * Delete an endpoint
   */
  async deleteEndpoint(endpointId: number): Promise<void> {
    await this.api.delete<ApiResponse<void>>(`/admin/endpoints/${endpointId}`);
  }

  /**
   * Bulk create endpoints from drafts
   */
  async createEndpointsFromDrafts(
    schemaId: number,
    drafts: AdminEndpointDraft[]
  ): Promise<AdminEndpointItem[]> {
    const createdEndpoints = await Promise.all(
      drafts.map((draft) =>
        this.createEndpoint({
          schemaId,
          method: draft.method,
          path: draft.path,
          summary: draft.summary,
          description: draft.description,
          operationId: draft.operationId,
          tags: draft.tags,
          deprecated: draft.deprecated,
          status: draft.status,
          parameters: draft.parameters,
          requestBody: draft.requestBody,
          responses: draft.responses,
        })
      )
    );

    return createdEndpoints;
  }
}
