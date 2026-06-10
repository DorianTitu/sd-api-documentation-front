import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  type AdminSchemaItem,
  type ApiResponse,
  type DocumentedSchema,
  type PrivateSchemaWithAccesses,
} from '../../shared/models/portal.models';

export interface SchemaExtractionResponse {
  title: string;
  description: string;
  version: string;
  endpoints: unknown[];
  rawSchemaJson: string;
}

@Injectable({ providedIn: 'root' })
export class SchemaFacadeService {
  private readonly api = inject(ApiService);

  /**
   * Get all admin schemas
   */
  async getAdminSchemas(): Promise<AdminSchemaItem[]> {
    const response = await this.api.get<ApiResponse<AdminSchemaItem[]>>('/admin/schemas');
    return response.data ?? [];
  }

  /**
   * Get public schemas with endpoints (user-facing catalog)
   */
  async getPublicCatalog(): Promise<DocumentedSchema[]> {
    const response = await this.api.get<ApiResponse<DocumentedSchema[]>>('/schemas');
    return response.data ?? [];
  }

  /**
   * Get public schema endpoints
   */
  async getPublicSchemaEndpoints(schemaId: number | string): Promise<any[]> {
    const response = await this.api.get<ApiResponse<any[]>>(`/schemas/${schemaId}/endpoints`);
    return response.data ?? [];
  }

  /**
   * Create a new schema
   */
  async createSchema(request: {
    sourceUrl: string;
    title: string;
    description: string | null;
    version: string;
    visibility: 'PUBLICO' | 'PRIVADO';
    rawSchemaJson: string;
  }): Promise<AdminSchemaItem> {
    const response = await this.api.post<ApiResponse<AdminSchemaItem>>('/admin/schemas', request);

    if (!response.data) {
      throw new Error(response.message ?? 'Failed to create schema');
    }

    return response.data;
  }

  /**
   * Update an existing schema
   */
  async updateSchema(
    schemaId: number,
    request: {
      sourceUrl: string;
      title: string;
      description: string | null;
      version: string;
      visibility: 'PUBLICO' | 'PRIVADO';
      rawSchemaJson: string;
    }
  ): Promise<AdminSchemaItem> {
    const response = await this.api.put<ApiResponse<AdminSchemaItem>>(`/admin/schemas/${schemaId}`, request);

    if (!response.data) {
      throw new Error(response.message ?? 'Failed to update schema');
    }

    return response.data;
  }

  /**
   * Delete a schema
   */
  async deleteSchema(schemaId: number): Promise<void> {
    await this.api.delete<ApiResponse<void>>(`/admin/schemas/${schemaId}`);
  }

  /**
   * Extract schema from URL
   */
  async extractSchemaFromUrl(url: string): Promise<SchemaExtractionResponse> {
    const response = await this.api.post<ApiResponse<SchemaExtractionResponse>>('/admin/schemas/extract', {
      url,
    });

    if (!response.data) {
      throw new Error(response.message ?? 'Failed to extract schema');
    }

    return response.data;
  }

  /**
   * Get private schemas with their access information
   */
  async getPrivateSchemasWithAccess(): Promise<PrivateSchemaWithAccesses[]> {
    const allSchemas = await this.getAdminSchemas();
    const privateSchemas = allSchemas.filter((s) => s.visibility === 'PRIVADO');

    // Fetch accesses for each private schema
    const schemasWithAccesses = await Promise.all(
      privateSchemas.map(async (schema) => ({
        ...schema,
        accesses: await this.getSchemaAccesses(schema.id),
      }))
    );

    return schemasWithAccesses as PrivateSchemaWithAccesses[];
  }

  /**
   * Get accesses for a specific schema
   */
  async getSchemaAccesses(schemaId: number | string): Promise<any[]> {
    const response = await this.api.get<ApiResponse<any[]>>(`/admin/schemas/${schemaId}/accesses`);
    return response.data ?? [];
  }

  /**
   * Grant access to a schema
   */
  async grantSchemaAccess(schemaId: number, developerUserId: number): Promise<void> {
    await this.api.post<ApiResponse<void>>(`/admin/schemas/${schemaId}/accesses`, {
      developerUserId,
    });
  }

  /**
   * Revoke access from a schema
   */
  async revokeSchemaAccess(schemaId: number, developerUserId: number): Promise<void> {
    await this.api.delete<ApiResponse<void>>(`/admin/schemas/${schemaId}/accesses/${developerUserId}`);
  }
}
