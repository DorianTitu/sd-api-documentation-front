import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ApiResponse, DocumentedSchema, AdminSchemaItem } from '../../shared/models/portal.models';

@Injectable({ providedIn: 'root' })
export class SchemasService {
  private readonly api = inject(ApiService);

  async getPublicSchemas(): Promise<DocumentedSchema[]> {
    const response = await this.api.get<ApiResponse<DocumentedSchema[]>>('/schemas');
    return response.data ?? [];
  }

  async getAdminSchemas(): Promise<AdminSchemaItem[]> {
    const response = await this.api.get<ApiResponse<AdminSchemaItem[]>>('/admin/schemas');
    return response.data ?? [];
  }

  async createAdminSchema(payload: any): Promise<AdminSchemaItem> {
    const response = await this.api.post<ApiResponse<AdminSchemaItem>>('/admin/schemas', payload);
    if (!response.data) {
      throw new Error('Failed to create schema');
    }
    return response.data;
  }

  async updateAdminSchema(id: number, payload: any): Promise<AdminSchemaItem> {
    const response = await this.api.put<ApiResponse<AdminSchemaItem>>(`/admin/schemas/${id}`, payload);
    if (!response.data) {
      throw new Error('Failed to update schema');
    }
    return response.data;
  }

  async deleteAdminSchema(id: number): Promise<void> {
    await this.api.delete<ApiResponse<null>>(`/admin/schemas/${id}`);
  }

  async extractSchema(url: string): Promise<unknown> {
    const response = await this.api.post<ApiResponse<unknown>>('/admin/schemas/extract', { url });
    return response.data ?? null;
  }
}
