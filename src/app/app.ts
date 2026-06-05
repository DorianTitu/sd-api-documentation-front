import { Component, ElementRef, computed, effect, signal, viewChild } from '@angular/core';

import { environment } from '../environments/environment';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiVersion = string;
type SectionId =
  | 'overview'
  | 'parameters'
  | 'headers'
  | 'request-body'
  | 'responses'
  | 'errors'
  | 'examples';
type UserRole = 'ADMINISTRADOR' | 'DESARROLLADOR';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

interface ErrorApiResponse {
  success: false;
  message: string;
  errorCode?: string;
  details?: string[];
  timestamp?: string;
}

interface LoginData {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: AuthUser;
}

interface AuthUser {
  id: number;
  correo: string;
  nombre: string;
  tipoUsuario: UserRole;
}

interface DocumentedSchema {
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

interface DocumentedEndpoint {
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

interface ParameterRow {
  name: string;
  type: string;
  requirement: 'Required' | 'Optional';
  description: string;
  example?: string;
}

interface HeaderRow {
  name: string;
  value: string;
  description: string;
}

interface ResponseRow {
  status: string;
  label: string;
  body: string;
}

interface ErrorRow {
  code: string;
  description: string;
}

interface EndpointDoc {
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

interface ServiceEndpointRef {
  id: string;
  method: HttpMethod;
  path: string;
}

interface ServiceGroup {
  id: string;
  title: string;
  icon: string;
  locked: boolean;
  expanded: boolean;
  endpoints: ServiceEndpointRef[];
}

const STORAGE_TOKEN_KEY = 'sd.portal.token';
const STORAGE_TOKEN_TYPE_KEY = 'sd.portal.tokenType';
const STORAGE_USER_KEY = 'sd.portal.user';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  protected readonly contentScroll = viewChild<ElementRef<HTMLElement>>('contentScroll');

  protected readonly apiBaseUrl = environment.apiBaseUrl;
  protected readonly activeSection = signal<SectionId>('overview');
  protected readonly searchQuery = signal('');
  protected readonly selectedVersion = signal<ApiVersion>('v2');
  protected readonly isAuthenticated = signal(false);
  protected readonly authToken = signal('');
  protected readonly currentUser = signal<AuthUser | null>(null);
  protected readonly currentRole = signal<UserRole | null>(null);
  protected readonly showLoginModal = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly loginEmail = signal('');
  protected readonly loginPassword = signal('');
  protected readonly loginLoading = signal(false);
  protected readonly loginError = signal<string | null>(null);
  protected readonly activeEndpointId = signal('');
  protected readonly openServiceIds = signal<string[]>([]);
  protected readonly notice = signal<string | null>(null);
  protected readonly copyState = signal<'Copy' | 'Copied'>('Copy');
  protected readonly schemas = signal<DocumentedSchema[]>([]);
  protected readonly services = signal<ServiceGroup[]>([]);
  protected readonly endpointDocs = signal<EndpointDoc[]>([]);

  protected readonly userInitials = computed(() => {
    const name = this.currentUser()?.nombre ?? 'Usuario';
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
    return initials || 'SD';
  });

  protected readonly userName = computed(() => this.currentUser()?.nombre ?? 'Usuario');
  protected readonly userRoleLabel = computed(() => this.currentRole() ?? '');
  protected readonly isAdmin = computed(() => this.currentRole() === 'ADMINISTRADOR');
  protected readonly isDeveloper = computed(() => this.currentRole() === 'DESARROLLADOR');

  protected versionOptions: ApiVersion[] = ['v2'];

  protected readonly activeDoc = computed(() => {
    const endpointId = this.activeEndpointId();
    if (!endpointId) {
      return null;
    }

    return this.endpointDocs().find((doc) => doc.id === endpointId) ?? null;
  });

  protected readonly activeServiceTitle = computed(() => {
    const currentDoc = this.activeDoc();
    if (!currentDoc) {
      return '';
    }

    return this.services().find((service) => service.id === currentDoc.serviceId)?.title ?? '';
  });

  protected readonly visibleServices = computed(() => {
    const query = this.normalize(this.searchQuery());
    const currentActive = this.activeEndpointId();
    const openIds = new Set(this.openServiceIds());

    return this.services()
      .filter((service) => {
        if (!query) {
          return true;
        }

        const serviceMatches = this.normalize(service.title).includes(query);
        const endpointMatches = service.endpoints.some((endpoint) => {
          const doc = this.getDocById(endpoint.id);
          return doc ? this.docMatches(doc, query) : false;
        });

        return serviceMatches || endpointMatches;
      })
      .map((service) => ({
        ...service,
        locked: service.locked && !this.isAuthenticated(),
        expanded: query ? true : openIds.has(service.id),
        endpoints: service.endpoints
          .filter((endpoint) => {
            if (!query) {
              return true;
            }

            const doc = this.getDocById(endpoint.id);
            return doc ? this.docMatches(doc, query) : false;
          })
          .map((endpoint) => ({
            ...endpoint,
            active: endpoint.id === currentActive,
          })),
      }))
      .filter((service) => (service.locked ? true : service.endpoints.length > 0 || !query));
  });

  protected readonly tocItems = computed(() => {
    const doc = this.activeDoc();
    if (!doc) {
      return [] as Array<{ id: SectionId; label: string }>;
    }

    return this.docSections(doc);
  });

  protected readonly copyLabel = computed(() => this.copyState());

  constructor() {
    this.restoreSession();
    void this.refreshCatalog();

    effect(() => {
      const visibleIds = this.visibleServices().flatMap((service) =>
        service.endpoints.map((endpoint) => endpoint.id),
      );
      const current = this.activeEndpointId();

      if (visibleIds.length > 0 && !visibleIds.includes(current)) {
        this.activeEndpointId.set(visibleIds[0]);
      }
    });
  }

  protected selectVersion(version: string): void {
    this.selectedVersion.set(version);
  }

  protected openLoginModal(): void {
    this.loginError.set(null);
    this.showLoginModal.set(true);
    this.passwordVisible.set(false);
  }

  protected closeLoginModal(): void {
    this.showLoginModal.set(false);
    this.passwordVisible.set(false);
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((current) => !current);
  }

  protected setLoginEmail(value: string): void {
    this.loginEmail.set(value);
  }

  protected setLoginPassword(value: string): void {
    this.loginPassword.set(value);
  }

  protected async submitLogin(): Promise<void> {
    const correo = this.loginEmail().trim();
    const clave = this.loginPassword();

    if (!correo || !clave) {
      this.loginError.set('Ingresa tu correo y tu clave para continuar.');
      return;
    }

    this.loginLoading.set(true);
    this.loginError.set(null);

    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ correo, clave }),
      });

      const payload = (await response.json().catch(() => null)) as
        | ApiResponse<LoginData>
        | ErrorApiResponse
        | null;

      if (!response.ok || !payload || !('success' in payload) || !payload.success) {
        const errorMessage =
          payload && 'message' in payload && payload.message
            ? payload.message
            : 'No fue posible iniciar sesión.';
        const details =
          payload && 'details' in payload && Array.isArray(payload.details) && payload.details.length > 0
            ? ` ${payload.details[0]}`
            : '';
        throw new Error(`${errorMessage}${details}`.trim());
      }

      const data = payload.data;
      if (!data?.accessToken || !data.usuario) {
        throw new Error('La respuesta de autenticación no contiene un token válido.');
      }

      this.persistSession(data.accessToken, data.tokenType, data.usuario);
      this.currentUser.set(data.usuario);
      this.currentRole.set(data.usuario.tipoUsuario);
      this.authToken.set(data.accessToken);
      this.isAuthenticated.set(true);
      this.closeLoginModal();
      this.searchQuery.set('');
      this.notice.set(null);

      if (data.usuario.tipoUsuario === 'DESARROLLADOR') {
        await this.refreshCatalog();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible iniciar sesión.';
      this.loginError.set(message);
      this.notice.set(message);
    } finally {
      this.loginLoading.set(false);
    }
  }

  protected async toggleSession(): Promise<void> {
    this.notice.set(null);
    this.clearStoredSession();
    this.authToken.set('');
    this.currentUser.set(null);
    this.currentRole.set(null);
    this.isAuthenticated.set(false);
    this.closeLoginModal();
    await this.refreshCatalog();
  }

  protected setSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  protected toggleService(serviceId: string): void {
    const service = this.services().find((item) => item.id === serviceId);
    if (!service) {
      return;
    }

    if (service.locked && !this.isAuthenticated()) {
      this.notice.set('Debes iniciar sesión para acceder a esta documentación.');
      return;
    }

    this.notice.set(null);
    this.openServiceIds.update((current) =>
      current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId],
    );
  }

  protected selectEndpoint(endpointId: string): void {
    const doc = this.getDocById(endpointId);
    if (!doc) {
      return;
    }

    if (doc.private && !this.isAuthenticated()) {
      this.notice.set('Debes iniciar sesión para acceder a esta documentación.');
      return;
    }

    this.notice.set(null);
    this.activeEndpointId.set(endpointId);
    this.openServiceIds.update((current) =>
      current.includes(doc.serviceId) ? current : [...current, doc.serviceId],
    );

    this.contentScroll()?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected scrollTo(sectionId: SectionId): void {
    this.activeSection.set(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected clearNotice(): void {
    this.notice.set(null);
  }

  protected async copyExample(): Promise<void> {
    const doc = this.activeDoc();
    if (!doc) {
      return;
    }

    await navigator.clipboard.writeText(this.renderExampleCode(doc));
    this.copyState.set('Copied');
    window.setTimeout(() => this.copyState.set('Copy'), 1400);
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchInput()?.nativeElement.focus();
    }
  }

  protected endpointUrl(doc: EndpointDoc): string {
    return doc.detailUrl;
  }

  protected renderExampleCode(doc: EndpointDoc): string {
    return doc.exampleCode;
  }

  protected isGroupActive(serviceId: string): boolean {
    return this.activeDoc()?.serviceId === serviceId;
  }

  protected docSections(doc: EndpointDoc): Array<{ id: SectionId; label: string }> {
    const sections: Array<{ id: SectionId; label: string }> = [
      { id: 'overview', label: 'Overview' },
      { id: 'parameters', label: 'Parameters' },
      { id: 'headers', label: 'Headers' },
    ];

    if (doc.requestBody.length > 0 || doc.private) {
      sections.push({ id: 'request-body', label: 'Request Body' });
    }

    sections.push({ id: 'responses', label: 'Responses' });
    sections.push({ id: 'errors', label: 'Errors' });
    sections.push({ id: 'examples', label: 'Examples' });
    return sections;
  }

  protected serviceNotice(): string {
    if (this.isAuthenticated()) {
      return this.schemas().length > 0
        ? 'Documentación cargada desde el backend.'
        : `Conecta el backend en ${this.apiBaseUrl} para cargar la documentación.`;
    }

    return this.schemas().length > 0
      ? 'Explora la documentación pública. Inicia sesión para desbloquear los esquemas privados.'
      : `Conecta el backend en ${this.apiBaseUrl} para cargar la documentación pública.`;
  }

  protected openDeveloperLogin(): void {
    this.openLoginModal();
  }

  private restoreSession(): void {
    try {
      const token = localStorage.getItem(STORAGE_TOKEN_KEY);
      const tokenType = localStorage.getItem(STORAGE_TOKEN_TYPE_KEY);
      const userRaw = localStorage.getItem(STORAGE_USER_KEY);

      if (!token || !userRaw) {
        this.showLoginModal.set(false);
        return;
      }

      const user = JSON.parse(userRaw) as AuthUser | null;
      if (!user?.tipoUsuario) {
        this.clearStoredSession();
        this.showLoginModal.set(true);
        return;
      }

      this.authToken.set(token);
      this.currentUser.set(user);
      this.currentRole.set(user.tipoUsuario);
      this.isAuthenticated.set(true);
      this.showLoginModal.set(false);
      this.loginEmail.set(user.correo);
      if (tokenType) {
        void tokenType;
      }
    } catch {
      this.clearStoredSession();
      this.clearCatalog();
      this.showLoginModal.set(false);
    }
  }

  private persistSession(token: string, tokenType: string, user: AuthUser): void {
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    localStorage.setItem(STORAGE_TOKEN_TYPE_KEY, tokenType || 'Bearer');
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  }

  private clearStoredSession(): void {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_TOKEN_TYPE_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
  }

  private clearCatalog(): void {
    this.schemas.set([]);
    this.services.set([]);
    this.endpointDocs.set([]);
    this.activeEndpointId.set('');
    this.openServiceIds.set([]);
    this.versionOptions = ['v2'];
    this.selectedVersion.set('v2');
  }

  private normalize(value: string): string {
    return value.toLowerCase().trim();
  }

  private normalizeMethod(method: string): HttpMethod {
    const normalized = method.toUpperCase();
    return (['GET', 'POST', 'PUT', 'DELETE'].includes(normalized) ? normalized : 'GET') as HttpMethod;
  }

  private iconForSchema(title: string): string {
    const lowered = title.toLowerCase();
    if (lowered.includes('auth')) return 'vpn_key';
    if (lowered.includes('customer')) return 'group';
    if (lowered.includes('billing')) return 'lock';
    if (lowered.includes('payment')) return 'payments';
    return 'schema';
  }

  private docMatches(doc: EndpointDoc, query: string): boolean {
    const haystack = [doc.title, doc.path, doc.summary, doc.description, doc.method]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  }

  private async refreshCatalog(): Promise<void> {
    try {
      const response = await this.requestJson<ApiResponse<DocumentedSchema[]>>('/schemas');
      const schemas = response.data ?? [];
      this.schemas.set(schemas);

      const versions = Array.from(new Set(schemas.map((schema) => schema.version))).sort();
      this.versionOptions = versions.length > 0 ? versions : ['v2'];

      const loaded = await Promise.all(
        schemas.map(async (schema) => {
          const endpointsResponse = await this.requestJson<ApiResponse<DocumentedEndpoint[]>>(
            `/schemas/${schema.id}/endpoints`,
          );
          return {
            schema,
            endpoints: endpointsResponse.data ?? [],
          };
        }),
      );

      const mappedServices: ServiceGroup[] = loaded.map(({ schema, endpoints }) => ({
        id: String(schema.id),
        title: schema.title,
        icon: this.iconForSchema(schema.title),
        locked: schema.visibility === 'PRIVADO' && !this.isAuthenticated(),
        expanded: false,
        endpoints: endpoints.map((endpoint) => ({
          id: String(endpoint.id),
          method: this.normalizeMethod(endpoint.method),
          path: endpoint.path,
        })),
      }));

      const mappedDocs: EndpointDoc[] = loaded.flatMap(({ schema, endpoints }) =>
        endpoints.map((endpoint) => this.mapEndpoint(schema, endpoint)),
      );

      this.services.set(mappedServices);
      this.endpointDocs.set(mappedDocs);

      if (mappedDocs.length > 0) {
        const current = this.activeEndpointId();
        const nextActive = mappedDocs.find((doc) => doc.id === current) ?? mappedDocs[0];
        this.activeEndpointId.set(nextActive.id);

        const openServices = new Set<string>();
        mappedServices.forEach((service) => {
          if (service.endpoints.some((endpoint) => endpoint.id === nextActive.id)) {
            openServices.add(service.id);
          }
        });
        this.openServiceIds.set(Array.from(openServices));

        if (!this.selectedVersion() || !this.versionOptions.includes(this.selectedVersion())) {
          this.selectedVersion.set(nextActive.version);
        }
      } else {
        this.activeEndpointId.set('');
        this.openServiceIds.set([]);
      }

      this.notice.set(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const unauthorized = /401|403|unauthorized|forbidden/i.test(message);

      if (unauthorized) {
        this.clearStoredSession();
        this.authToken.set('');
        this.currentUser.set(null);
        this.currentRole.set(null);
        this.isAuthenticated.set(false);
        this.loginError.set('Tu sesión expiró. Vuelve a iniciar sesión.');
      }

      this.schemas.set([]);
      this.services.set([]);
      this.endpointDocs.set([]);
      this.activeEndpointId.set('');
      this.openServiceIds.set([]);
      this.notice.set('No se pudo cargar la documentación desde el backend.');
    }
  }

  private mapEndpoint(schema: DocumentedSchema, endpoint: DocumentedEndpoint): EndpointDoc {
    const requiresAuth = schema.visibility === 'PRIVADO' || endpoint.status !== 'VISIBLE';
    const headers: HeaderRow[] = [];

    if (requiresAuth) {
      headers.push({
        name: 'Authorization',
        value: 'Bearer TOKEN_AQUI',
        description: 'Bearer token required to access this schema.',
      });
    }

    if (endpoint.requestBody) {
      headers.push({
        name: 'Content-Type',
        value: endpoint.requestBody.contentType ?? 'application/json',
        description: 'Payload type expected by the backend.',
      });
    }

    const parameters: ParameterRow[] = endpoint.parameters.map((parameter) => ({
      name: parameter.name,
      type: [parameter.location, parameter.type, parameter.format].filter(Boolean).join(' / ') || 'unknown',
      requirement: parameter.required ? 'Required' : 'Optional',
      description: `Schema ref: ${parameter.schemaRef ?? '—'}`,
      example: parameter.schemaRef ?? parameter.type ?? '—',
    }));

    const requestBody: ParameterRow[] = endpoint.requestBody
      ? [
          {
            name: 'requestBody',
            type: [endpoint.requestBody.contentType, endpoint.requestBody.schemaType]
              .filter(Boolean)
              .join(' / ') || 'object',
            requirement: endpoint.requestBody.required ? 'Required' : 'Optional',
            description: `Schema ref: ${endpoint.requestBody.schemaRef ?? '—'}`,
            example: endpoint.requestBody.schemaRef ?? endpoint.requestBody.schemaType ?? '—',
          },
        ]
      : [];

    const responses: ResponseRow[] = endpoint.responses.map((response) => ({
      status: response.statusCode,
      label: response.description ?? 'Response',
      body: JSON.stringify(
        {
          statusCode: response.statusCode,
          contentType: response.contentType,
          schemaType: response.schemaType,
          schemaRef: response.schemaRef,
        },
        null,
        2,
      ),
    }));

    const errors: ErrorRow[] = [
      { code: '401', description: 'Authentication is required to access this resource.' },
      { code: '403', description: 'You do not have access to this schema documentation.' },
      { code: '404', description: 'Schema or endpoint not found.' },
      { code: '500', description: 'The backend failed to resolve the documentation payload.' },
    ];

    return {
      id: String(endpoint.id),
      serviceId: String(schema.id),
      title: endpoint.summary ?? endpoint.path,
      method: this.normalizeMethod(endpoint.method),
      path: endpoint.path,
      summary: endpoint.summary ?? endpoint.path,
      description: endpoint.description ?? endpoint.summary ?? endpoint.path,
      private: schema.visibility === 'PRIVADO',
      version: schema.version,
      detailUrl: `${this.apiBaseUrl}/schemas/${schema.id}/endpoints/${endpoint.id}`,
      parameters,
      headers,
      requestBody,
      responses,
      errors,
      exampleLabel: 'cURL / Request',
      exampleVersion: schema.version,
      exampleCode: `curl ${this.apiBaseUrl}/schemas/${schema.id}/endpoints/${endpoint.id}`,
    };
  }

  private async requestJson<T>(path: string): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.authToken()) {
      headers['Authorization'] = `Bearer ${this.authToken()}`;
    }

    const response = await fetch(`${this.apiBaseUrl}${path}`, { headers });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const body = (await response.json()) as { message?: string };
        message = body.message ?? message;
      } catch {
        // Ignore invalid JSON errors.
      }
      throw new Error(message);
    }

    return (await response.json()) as T;
  }

  protected renderResponseExample(doc: EndpointDoc): string {
    return doc.responses[0]?.body ?? '{}';
  }

  private getDocById(id: string): EndpointDoc | undefined {
    return this.endpointDocs().find((item) => item.id === id);
  }
}
