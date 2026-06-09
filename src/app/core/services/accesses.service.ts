import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ApiResponse, AdminAccessItem } from '../../shared/models/portal.models';

@Injectable({ providedIn: 'root' })
export class AccessesService {
  private readonly api = inject(ApiService);

  async getSchemaAccesses(schemaId: number): Promise<AdminAccessItem[]> {
    const response = await this.api.get<ApiResponse<AdminAccessItem[]>>(`/admin/schemas/${schemaId}/accesses`);
    return (response.data ?? []).map(this.normalizeAccess);
  }

  async grantSchemaAccess(schemaId: number, developerUserId: number): Promise<void> {
    await this.api.post<ApiResponse<null>>(`/admin/schemas/${schemaId}/accesses`, { developerUserId });
  }

  async revokeSchemaAccess(schemaId: number, developerUserId: number): Promise<void> {
    await this.api.delete<ApiResponse<null>>(`/admin/schemas/${schemaId}/accesses/${developerUserId}`);
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
