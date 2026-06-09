import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ApiResponse, DocumentedEndpoint, AdminEndpointItem } from '../../shared/models/portal.models';

@Injectable({ providedIn: 'root' })
export class EndpointsService {
  private readonly api = inject(ApiService);

  async getSchemaEndpoints(schemaId: number): Promise<DocumentedEndpoint[]> {
    const response = await this.api.get<ApiResponse<DocumentedEndpoint[]>>(`/schemas/${schemaId}/endpoints`);
    return response.data ?? [];
  }

  async getAdminEndpoints(): Promise<AdminEndpointItem[]> {
    const response = await this.api.get<ApiResponse<AdminEndpointItem[]>>('/admin/endpoints');
    return response.data ?? [];
  }

  async getAdminEndpointsBySchemaId(schemaId: number): Promise<AdminEndpointItem[]> {
    const endpoints = await this.getAdminEndpoints();
    return endpoints.filter(e => e.schemaId === schemaId);
  }

  async createAdminEndpoint(payload: any): Promise<AdminEndpointItem> {
    const response = await this.api.post<ApiResponse<AdminEndpointItem>>('/admin/endpoints', payload);
    if (!response.data) {
      throw new Error('Failed to create endpoint');
    }
    return response.data;
  }

  async updateAdminEndpoint(id: number, payload: any): Promise<AdminEndpointItem> {
    const response = await this.api.put<ApiResponse<AdminEndpointItem>>(`/admin/endpoints/${id}`, payload);
    if (!response.data) {
      throw new Error('Failed to update endpoint');
    }
    return response.data;
  }

  async deleteAdminEndpoint(id: number): Promise<void> {
    await this.api.delete<ApiResponse<null>>(`/admin/endpoints/${id}`);
  }
}
