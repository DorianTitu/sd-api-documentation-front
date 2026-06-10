export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type ApiVersion = string;
export type SectionId =
  | 'overview'
  | 'parameters'
  | 'headers'
  | 'request-body'
  | 'responses'
  | 'errors'
  | 'examples';
export type UserRole = 'ADMINISTRADOR' | 'DESARROLLADOR';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface ErrorApiResponse {
  success: false;
  message: string;
  errorCode?: string;
  details?: string[];
  timestamp?: string;
}

export interface LoginData {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: AuthUser;
}

export interface AuthUser {
  id: number;
  correo: string;
  nombre: string;
  tipoUsuario: UserRole;
}

export interface DocumentedSchema {
  id: number;
  sourceUrl: string;
  title: string;
  description: string | null;
  version: string;
  visibility: 'PUBLICO' | 'PRIVADO';
  rawSchema: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentedEndpoint {
  id: number;
  schemaId: number;
  sourceUrl: string;
  path: string;
  method: string;
  tag: string | null;
  summary: string | null;
  description: string | null;
  operationId: string | null;
  tags: string[];
  deprecated: boolean;
  status: 'VISIBLE' | 'OCULTO' | 'PENDIENTE_ACTUALIZACION' | 'PENDIENTE_DOCUMENTACION';
  parameters: Array<{
    name: string;
    location: string;
    required: boolean;
    type: string | null;
    format: string | null;
    schemaRef: string | null;
  }>;
  requestBody:
    | {
        required: boolean;
        contentType: string | null;
        schemaRef: string | null;
        schemaType: string | null;
      }
    | null;
  responses: Array<{
    statusCode: string;
    description: string | null;
    contentType: string | null;
    schemaRef: string | null;
    schemaType: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ParameterRow {
  name: string;
  type: string;
  requirement: 'Required' | 'Optional';
  description: string;
  example?: string;
}

export interface HeaderRow {
  name: string;
  value: string;
  description: string;
}

export interface ResponseRow {
  status: string;
  label: string;
  body: string;
}

export interface ErrorRow {
  code: string;
  description: string;
}

export interface EndpointDoc {
  id: string;
  serviceId: string;
  title: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  private: boolean;
  version: ApiVersion;
  detailUrl: string;
  parameters: ParameterRow[];
  headers: HeaderRow[];
  requestBody: ParameterRow[];
  responses: ResponseRow[];
  errors: ErrorRow[];
  exampleLabel: string;
  exampleVersion: string;
  exampleCode: string;
}

export interface ServiceEndpointRef {
  id: string;
  method: HttpMethod;
  path: string;
  label: string;
}

export interface ServiceGroup {
  id: string;
  title: string;
  icon: string;
  locked: boolean;
  expanded: boolean;
  endpoints: ServiceEndpointRef[];
}

export type AdminView = 'dashboard' | 'permisos' | 'usuarios' | 'esquemas';

export interface AdminSchemaItem {
  id: number;
  sourceUrl: string;
  title: string;
  description: string | null;
  version: string;
  visibility: 'PUBLICO' | 'PRIVADO';
  rawSchema: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminEndpointItem {
  id: number;
  schemaId: number;
  sourceUrl?: string;
  path: string;
  method: string;
  tag?: string | null;
  summary?: string | null;
  description?: string | null;
  operationId?: string | null;
  tags?: string[];
  deprecated?: boolean;
  status: 'VISIBLE' | 'OCULTO' | 'PENDIENTE_ACTUALIZACION' | 'PENDIENTE_DOCUMENTACION';
  parameters?: DocumentedEndpoint['parameters'];
  requestBody?: DocumentedEndpoint['requestBody'];
  responses?: DocumentedEndpoint['responses'];
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminAccessItem {
  developerUserId: number;
  developerName?: string;
  developerCorreo?: string;
  correo?: string;
  nombre?: string;
  assignedAt?: string;
  grantedAt?: string;
}

export interface PrivateSchemaWithAccesses extends AdminSchemaItem {
  accesses?: AdminAccessItem[];
}

export interface AdminEndpointDraft {
  path: string;
  method: HttpMethod;
  summary: string;
  description: string;
  operationId: string;
  tags: string[];
  deprecated: boolean;
  status: AdminEndpointItem['status'];
  parameters: DocumentedEndpoint['parameters'];
  requestBody: DocumentedEndpoint['requestBody'];
  responses: DocumentedEndpoint['responses'];
}
