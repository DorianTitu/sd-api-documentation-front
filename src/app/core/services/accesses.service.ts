import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { type ApiResponse, type AdminAccessItem } from '../../shared/models/portal.models';

export interface SchemaAccessResponse {
  id: number;
  schemaId: number;
  developerUserId: number;
  developerCorreo: string;
  developerNombre: string;
  grantedByUserId: number;
  grantedByCorreo: string;
  grantedAt: string;
}

export interface PrivateSchemaWithAccesses {
  id: string;
  title: string;
  version: string;
  description: string;
  visibility: 'PUBLICO' | 'PRIVADO';
  accesses: SchemaAccessResponse[];
}

@Injectable({ providedIn: 'root' })
export class AccessesService {
  private readonly api = inject(ApiService);

  async getSchemaAccesses(schemaId: number): Promise<AdminAccessItem[]> {
    const response = await this.api.get<ApiResponse<AdminAccessItem[]>>(`/admin/schemas/${schemaId}/accesses`);
    return (response.data ?? []).map(this.normalizeAccess);
  }

  async getPrivateSchemasWithAccesses(): Promise<PrivateSchemaWithAccesses[]> {
    try {
      const response = await this.api.get<ApiResponse<PrivateSchemaWithAccesses[]>>('/admin/schemas');
      console.log('Schemas response:', response);

      const schemas = response.data || [];
      const privateSchemas = schemas.filter((s) => s.visibility === 'PRIVADO');

      // For each private schema, fetch its accesses
      return await Promise.all(
        privateSchemas.map(async (schema) => ({
          ...schema,
          accesses: await this.getSchemaAccessesRaw(schema.id),
        }))
      );
    } catch (error) {
      console.error('Error fetching private schemas:', error);
      throw error;
    }
  }

  private async getSchemaAccessesRaw(schemaId: string): Promise<SchemaAccessResponse[]> {
    try {
      const response = await this.api.get<ApiResponse<SchemaAccessResponse[]>>(
        `/admin/schemas/${schemaId}/accesses`
      );
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching accesses for schema ${schemaId}:`, error);
      return [];
    }
  }

  async grantSchemaAccess(schemaId: number, developerUserId: number): Promise<SchemaAccessResponse> {
    try {
      const response = await this.api.post<ApiResponse<SchemaAccessResponse>>(
        `/admin/schemas/${schemaId}/accesses`,
        { developerUserId }
      );

      if (!response.data) {
        throw new Error(response.message || 'Failed to grant access');
      }

      console.log('Access granted:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error granting access:', error);
      throw error;
    }
  }

  async revokeSchemaAccess(schemaId: number, developerUserId: number): Promise<void> {
    try {
      await this.api.delete<ApiResponse<void>>(`/admin/schemas/${schemaId}/accesses/${developerUserId}`);
      console.log('Access revoked for user:', developerUserId);
    } catch (error) {
      console.error('Error revoking access:', error);
      throw error;
    }
  }

  private normalizeAccess(item: unknown): AdminAccessItem {
    const record = item as AdminAccessItem & Record<string, unknown>;
    return {
      developerUserId: Number(record.developerUserId ?? record['id'] ?? 0),
      developerName: String(record.developerName ?? record.nombre ?? ''),
      developerCorreo: String(record.developerCorreo ?? record.correo ?? ''),
      correo: String(record.correo ?? ''),
      nombre: String(record.nombre ?? ''),
      assignedAt: String(record.assignedAt ?? record.grantedAt ?? ''),
      grantedAt: String(record.grantedAt ?? record.assignedAt ?? ''),
    };
  }
}
