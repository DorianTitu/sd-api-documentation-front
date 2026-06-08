import { Component, ElementRef, computed, effect, signal, viewChild } from '@angular/core';

import { environment } from '../environments/environment';
import {
  type AdminAccessItem,
  type AdminEndpointItem,
  type AdminSchemaItem,
  type AdminView,
  type ApiResponse,
  type ApiVersion,
  type AuthUser,
  type DocumentedEndpoint,
  type DocumentedSchema,
  type EndpointDoc,
  type ErrorApiResponse,
  type ErrorRow,
  type HeaderRow,
  type HttpMethod,
  type LoginData,
  type ParameterRow,
  type ResponseRow,
  type SectionId,
  type ServiceGroup,
  type UserRole,
} from './shared/models/portal.models';
import {
  STORAGE_TOKEN_KEY,
  STORAGE_TOKEN_TYPE_KEY,
  STORAGE_USER_KEY,
} from './core/constants/storage-keys';
import { DashboardComponent, type DashboardVm } from './features/dashboard/dashboard.component';
import { SchemasComponent, type SchemasVm } from './features/schemas/schemas.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';

@Component({
  selector: 'app-root',
  imports: [
    AdminLayoutComponent,
    AuthLayoutComponent,
    PublicLayoutComponent,
    DashboardComponent,
    SchemasComponent,
  ],
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
  protected readonly adminView = signal<AdminView>('dashboard');
  protected readonly adminSchemas = signal<AdminSchemaItem[]>([]);
  protected readonly adminEndpoints = signal<AdminEndpointItem[]>([]);
  protected readonly adminAccesses = signal<AdminAccessItem[]>([]);
  protected readonly adminExtractPreview = signal<unknown | null>(null);
  protected readonly adminNotice = signal<string | null>(null);
  protected readonly adminLoading = signal(false);
  protected readonly adminSelectedSchemaId = signal<string>('');
  protected readonly adminSelectedEndpointId = signal<string>('');
  protected readonly adminSchemaVisibilityFilter = signal<'ALL' | 'PUBLICO' | 'PRIVADO'>('ALL');
  protected readonly adminSchemaVersionFilter = signal('ALL');

  protected adminSchemaFormMode: 'create' | 'edit' = 'create';
  protected adminSchemaEditingId: number | null = null;
  protected adminSchemaSourceUrl = '';
  protected adminSchemaTitle = '';
  protected adminSchemaDescription = '';
  protected adminSchemaVersion = 'v1';
  protected adminSchemaVisibility: 'PUBLICO' | 'PRIVADO' = 'PUBLICO';
  protected adminSchemaRawSchemaText = `{
  "openapi": "3.1.0"
}`;

  protected adminEndpointFormMode: 'create' | 'edit' = 'create';
  protected adminEndpointEditingId: number | null = null;
  protected adminEndpointSchemaId = '';
  protected adminEndpointPath = '';
  protected adminEndpointMethod: HttpMethod = 'GET';
  protected adminEndpointSummary = '';
  protected adminEndpointDescription = '';
  protected adminEndpointOperationId = '';
  protected adminEndpointTags = '';
  protected adminEndpointDeprecated = false;
  protected adminEndpointStatus: AdminEndpointItem['status'] = 'VISIBLE';
  protected adminEndpointParametersText = '[]';
  protected adminEndpointRequestBodyText = 'null';
  protected adminEndpointResponsesText = '[]';

  protected adminAccessSchemaId = '';
  protected adminAccessDeveloperUserId = '';
  protected adminImportUrl = '';
  protected adminImportPreviewText = '';

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
  protected readonly adminSchemaCount = computed(() => this.adminSchemas().length);
  protected readonly adminEndpointCount = computed(() => this.adminEndpoints().length);
  protected readonly adminPrivateSchemaCount = computed(
    () => this.adminSchemas().filter((schema) => schema.visibility === 'PRIVADO').length,
  );
  protected readonly adminPublicSchemaCount = computed(
    () => this.adminSchemas().filter((schema) => schema.visibility === 'PUBLICO').length,
  );
  protected readonly adminPendingEndpointCount = computed(
    () =>
      this.adminEndpoints().filter(
        (endpoint) =>
          endpoint.status === 'PENDIENTE_DOCUMENTACION' ||
          endpoint.status === 'PENDIENTE_ACTUALIZACION',
      ).length,
  );
  protected readonly adminVisibleEndpointCount = computed(
    () => this.adminEndpoints().filter((endpoint) => endpoint.status === 'VISIBLE').length,
  );
  protected readonly adminHiddenEndpointCount = computed(
    () => this.adminEndpointCount() - this.adminVisibleEndpointCount(),
  );
  protected readonly adminCoveragePercent = computed(() => {
    const total = this.adminEndpointCount();
    if (!total) {
      return 0;
    }

    return Math.round((this.adminVisibleEndpointCount() / total) * 100);
  });
  protected readonly adminActivityFeed = computed(() => {
    const items = [
      ...this.adminSchemas().map((schema) => ({
        kind: 'Schema',
        title: schema.title,
        description: `${schema.version} · ${schema.visibility}`,
        date: schema.updatedAt || schema.createdAt || '',
        icon: 'schema',
      })),
      ...this.adminEndpoints().map((endpoint) => ({
        kind: 'Endpoint',
        title: endpoint.path,
        description: `${endpoint.method} · ${endpoint.status}`,
        date: endpoint.updatedAt || endpoint.createdAt || '',
        icon: 'api',
      })),
    ];

    return items
      .filter((item) => item.date)
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 5);
  });
  protected readonly selectedAdminSchema = computed(
    () => this.adminSchemas().find((schema) => String(schema.id) === this.adminSelectedSchemaId()) ?? null,
  );
  protected readonly selectedAdminEndpoint = computed(
    () =>
      this.adminEndpoints().find((endpoint) => String(endpoint.id) === this.adminSelectedEndpointId()) ??
      null,
  );
  protected readonly adminDashboardVm = computed<DashboardVm>(() => ({
    schemaCount: this.adminSchemaCount(),
    publicSchemaCount: this.adminPublicSchemaCount(),
    privateSchemaCount: this.adminPrivateSchemaCount(),
    endpointCount: this.adminEndpointCount(),
    visibleEndpointCount: this.adminVisibleEndpointCount(),
    hiddenEndpointCount: this.adminHiddenEndpointCount(),
    pendingEndpointCount: this.adminPendingEndpointCount(),
    coveragePercent: this.adminCoveragePercent(),
    donutDasharray: this.adminDonutDasharray(),
    activityFeed: this.adminActivityFeed(),
    formatDate: (value?: string) => this.formatAdminDate(value),
    navigate: (view: AdminView) => this.setAdminView(view),
    schemas: this.adminSchemas(),
  }));
  protected readonly adminSchemasVm = computed<SchemasVm>(() => ({
    notice: this.adminNotice(),
    clearNotice: () => this.clearAdminNotice(),
    filteredSchemas: this.filteredAdminSchemas(),
    selectedSchema: this.selectedAdminSchema(),
    schemaVisibilityFilter: () => this.adminSchemaVisibilityFilter(),
    schemaVersionFilter: () => this.adminSchemaVersionFilter(),
    schemaVersionOptions: this.adminSchemaVersionOptions(),
    schemaCountById: (schemaId: number) => this.adminSchemaEndpointCount(schemaId),
    formatDate: (value?: string) => this.formatAdminDate(value),
    setVisibilityFilter: (value: 'ALL' | 'PUBLICO' | 'PRIVADO') => this.setAdminSchemaVisibilityFilter(value),
    setVersionFilter: (value: string) => this.setAdminSchemaVersionFilter(value),
    setAdminView: (view: AdminView) => this.setAdminView(view),
    startCreateSchema: () => this.startCreateSchema(),
    loadAdminWorkspace: () => void this.loadAdminWorkspace(),
    selectSchema: (schemaId: number) => this.selectAdminSchema(schemaId),
    deleteSchema: (schemaId: number) => void this.deleteAdminSchema(schemaId),
    saveSchema: () => void this.saveAdminSchema(),
    resetSchema: () => this.startCreateSchema(),
    updateSchemaField: (field: 'sourceUrl' | 'title' | 'description' | 'version', value: string) =>
      this.updateAdminSchemaField(field, value),
    updateSchemaVisibility: (value: string) => this.updateAdminSchemaVisibility(value),
    updateSchemaRaw: (value: string) => this.updateAdminSchemaRawSchema(value),
    schemaFormMode: () => this.adminSchemaFormMode,
    schemaSourceUrl: () => this.adminSchemaSourceUrl,
    schemaTitle: () => this.adminSchemaTitle,
    schemaDescription: () => this.adminSchemaDescription,
    schemaVersion: () => this.adminSchemaVersion,
    schemaVisibility: () => this.adminSchemaVisibility,
    schemaRaw: () => this.adminSchemaRawSchemaText,
    loading: () => this.adminLoading(),
  }));
  protected readonly filteredAdminSchemas = computed(() => {
    const query = this.normalize(this.searchQuery());
    const visibilityFilter = this.adminSchemaVisibilityFilter();
    const versionFilter = this.adminSchemaVersionFilter();

    if (!query) {
      return this.adminSchemas().filter((schema) => {
        const matchesVisibility = visibilityFilter === 'ALL' || schema.visibility === visibilityFilter;
        const matchesVersion = versionFilter === 'ALL' || schema.version === versionFilter;
        return matchesVisibility && matchesVersion;
      });
    }

    return this.adminSchemas().filter((schema) => {
      const matchesSearch = [schema.title, schema.version, schema.visibility, schema.sourceUrl, schema.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query);
      const matchesVisibility = visibilityFilter === 'ALL' || schema.visibility === visibilityFilter;
      const matchesVersion = versionFilter === 'ALL' || schema.version === versionFilter;
      return matchesSearch && matchesVisibility && matchesVersion;
    });
  });
  protected readonly adminSchemaVersionOptions = computed(() =>
    Array.from(new Set(this.adminSchemas().map((schema) => schema.version).filter(Boolean))).sort(),
  );
  protected readonly filteredAdminEndpoints = computed(() => {
    const query = this.normalize(this.searchQuery());
    if (!query) {
      return this.adminEndpoints();
    }

    return this.adminEndpoints().filter((endpoint) =>
      [
        endpoint.path,
        endpoint.method,
        endpoint.summary ?? '',
        endpoint.description ?? '',
        endpoint.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  });
  protected readonly filteredAdminAccesses = computed(() => {
    const query = this.normalize(this.searchQuery());
    if (!query) {
      return this.adminAccesses();
    }

    return this.adminAccesses().filter((access) =>
      [
        access.developerName ?? access.nombre ?? '',
        access.developerCorreo ?? access.correo ?? '',
        String(access.developerUserId),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  });

  constructor() {
    this.restoreSession();
    void this.refreshCatalog();

    if (this.isAdmin()) {
      void this.loadAdminWorkspace();
    }

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

  protected setAdminView(view: AdminView): void {
    if (view !== 'dashboard' && view !== 'schemas') {
      return;
    }

    this.adminView.set(view);

    if (view === 'schemas' && this.adminSchemas().length === 0) {
      void this.loadAdminWorkspace();
    }
  }

  protected setAdminSchemaVisibilityFilter(value: 'ALL' | 'PUBLICO' | 'PRIVADO'): void {
    this.adminSchemaVisibilityFilter.set(value);
  }

  protected setAdminSchemaVersionFilter(value: string): void {
    this.adminSchemaVersionFilter.set(value || 'ALL');
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

      if (data.usuario.tipoUsuario === 'ADMINISTRADOR') {
        this.adminView.set('dashboard');
        await this.loadAdminWorkspace();
      } else if (data.usuario.tipoUsuario === 'DESARROLLADOR') {
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
    this.adminSchemas.set([]);
    this.adminEndpoints.set([]);
    this.adminAccesses.set([]);
    this.adminExtractPreview.set(null);
    this.adminNotice.set(null);
    this.adminLoading.set(false);
    this.adminSelectedSchemaId.set('');
    this.adminSelectedEndpointId.set('');
    this.adminView.set('dashboard');
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
    this.openServiceIds.set(this.openServiceIds()[0] === serviceId ? [] : [serviceId]);
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
    this.openServiceIds.set([doc.serviceId]);

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
    const lines = [`curl -X ${doc.method} "${doc.detailUrl}"`];

    if (doc.private) {
      lines.push(`  -H 'Authorization: Bearer YOUR_TOKEN'`);
    }

    const contentTypeHeader = doc.headers.find((header) => header.name.toLowerCase() === 'content-type');
    if (contentTypeHeader) {
      lines.push(`  -H 'Content-Type: ${contentTypeHeader.value}'`);
    }

    return lines.join(' \\\n');
  }

  protected isGroupOpen(serviceId: string): boolean {
    return this.openServiceIds()[0] === serviceId;
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
    return sections;
  }

  protected serviceNotice(): string {
    if (this.schemas().length > 0) {
      return this.isAuthenticated()
        ? 'Documentación disponible.'
        : 'Explora la documentación pública. Inicia sesión para desbloquear los esquemas privados.';
    }

    return 'Sistema fuera de servicio temporalmente.';
  }

  protected clearAdminNotice(): void {
    this.adminNotice.set(null);
  }

  protected jsonPreview(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  protected formatAdminDate(value?: string): string {
    if (!value) {
      return '—';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parsed);
  }

  protected adminDonutDasharray(): string {
    const percent = this.adminCoveragePercent();
    return `${percent}, 100`;
  }

  protected async loadAdminWorkspace(): Promise<void> {
    if (!this.isAdmin() || !this.authToken()) {
      return;
    }

    this.adminLoading.set(true);
    this.adminNotice.set(null);

    try {
      const [schemasResponse, endpointsResponse] = await Promise.all([
        this.requestJson<ApiResponse<AdminSchemaItem[]>>('/admin/schemas'),
        this.requestJson<ApiResponse<AdminEndpointItem[]>>('/admin/endpoints'),
      ]);

      this.adminSchemas.set(schemasResponse.data ?? []);
      this.adminEndpoints.set(endpointsResponse.data ?? []);

      if (!this.adminSelectedSchemaId() && (schemasResponse.data ?? []).length > 0) {
        this.selectAdminSchema((schemasResponse.data ?? [])[0].id, false);
      }

      if (!this.adminSelectedEndpointId() && (endpointsResponse.data ?? []).length > 0) {
        this.selectAdminEndpoint((endpointsResponse.data ?? [])[0].id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sistema fuera de servicio temporalmente.';
      this.adminNotice.set(message);
    } finally {
      this.adminLoading.set(false);
    }
  }

  protected startCreateSchema(): void {
    this.adminSchemaFormMode = 'create';
    this.adminSchemaEditingId = null;
    this.resetAdminSchemaForm();
    this.adminNotice.set(null);
  }

  protected selectAdminSchema(schemaId: number, loadAccesses = true): void {
    this.adminSelectedSchemaId.set(String(schemaId));
    this.adminSchemaEditingId = schemaId;

    const schema = this.adminSchemas().find((item) => item.id === schemaId);
    if (schema) {
      this.adminSchemaFormMode = 'edit';
      this.adminSchemaSourceUrl = schema.sourceUrl ?? '';
      this.adminSchemaTitle = schema.title ?? '';
      this.adminSchemaDescription = schema.description ?? '';
      this.adminSchemaVersion = schema.version ?? 'v1';
      this.adminSchemaVisibility = schema.visibility ?? 'PUBLICO';
      this.adminSchemaRawSchemaText = JSON.stringify(schema.rawSchema ?? {}, null, 2);
    }

    if (loadAccesses) {
      void this.loadSchemaAccesses(schemaId);
    }
  }

  protected async saveAdminSchema(): Promise<void> {
    const payload = this.parseAdminSchemaPayload();
    if (!payload) {
      return;
    }

    this.adminLoading.set(true);
    this.adminNotice.set(null);

    try {
      const isEdit = this.adminSchemaFormMode === 'edit' && this.adminSchemaEditingId !== null;
      const response = isEdit
        ? await this.requestJson<ApiResponse<AdminSchemaItem>>(`/admin/schemas/${this.adminSchemaEditingId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await this.requestJson<ApiResponse<AdminSchemaItem>>('/admin/schemas', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      if (response.data) {
        await this.loadAdminWorkspace();
        if (isEdit) {
          this.selectAdminSchema(response.data.id, false);
        } else {
          this.startCreateSchema();
        }
      }
    } catch (error) {
      this.adminNotice.set(error instanceof Error ? error.message : 'No fue posible guardar el schema.');
    } finally {
      this.adminLoading.set(false);
    }
  }

  protected async deleteAdminSchema(schemaId: number): Promise<void> {
    if (!confirm('¿Deseas eliminar este schema?')) {
      return;
    }

    this.adminLoading.set(true);
    this.adminNotice.set(null);

    try {
      await this.requestJson<ApiResponse<null>>(`/admin/schemas/${schemaId}`, {
        method: 'DELETE',
      });
      await this.loadAdminWorkspace();
      this.resetAdminSchemaForm();
    } catch (error) {
      this.adminNotice.set(error instanceof Error ? error.message : 'No fue posible eliminar el schema.');
    } finally {
      this.adminLoading.set(false);
    }
  }

  protected startCreateEndpoint(): void {
    this.adminEndpointFormMode = 'create';
    this.adminEndpointEditingId = null;
    if (!this.adminEndpointSchemaId && this.adminSchemas().length > 0) {
      this.adminEndpointSchemaId = String(this.adminSchemas()[0].id);
    }
    this.resetAdminEndpointForm();
    this.adminNotice.set(null);
  }

  protected selectAdminEndpoint(endpointId: number): void {
    this.adminSelectedEndpointId.set(String(endpointId));
    const endpoint = this.adminEndpoints().find((item) => item.id === endpointId);
    if (!endpoint) {
      return;
    }

    this.adminEndpointFormMode = 'edit';
    this.adminEndpointEditingId = endpointId;
    this.adminEndpointSchemaId = String(endpoint.schemaId ?? '');
    this.adminEndpointPath = endpoint.path ?? '';
    this.adminEndpointMethod = this.normalizeMethod(endpoint.method ?? 'GET');
    this.adminEndpointSummary = endpoint.summary ?? '';
    this.adminEndpointDescription = endpoint.description ?? '';
    this.adminEndpointOperationId = endpoint.operationId ?? '';
    this.adminEndpointTags = (endpoint.tags ?? []).join(', ');
    this.adminEndpointDeprecated = Boolean(endpoint.deprecated);
    this.adminEndpointStatus = endpoint.status ?? 'VISIBLE';
    this.adminEndpointParametersText = JSON.stringify(endpoint.parameters ?? [], null, 2);
    this.adminEndpointRequestBodyText = JSON.stringify(endpoint.requestBody ?? null, null, 2);
    this.adminEndpointResponsesText = JSON.stringify(endpoint.responses ?? [], null, 2);
  }

  protected async saveAdminEndpoint(): Promise<void> {
    const payload = this.parseAdminEndpointPayload();
    if (!payload) {
      return;
    }

    this.adminLoading.set(true);
    this.adminNotice.set(null);

    try {
      const isEdit = this.adminEndpointFormMode === 'edit' && this.adminEndpointEditingId !== null;
      const response = isEdit
        ? await this.requestJson<ApiResponse<AdminEndpointItem>>(`/admin/endpoints/${this.adminEndpointEditingId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await this.requestJson<ApiResponse<AdminEndpointItem>>('/admin/endpoints', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      if (response.data) {
        await this.loadAdminWorkspace();
        if (isEdit) {
          this.selectAdminEndpoint(response.data.id);
        } else {
          this.startCreateEndpoint();
        }
      }
    } catch (error) {
      this.adminNotice.set(error instanceof Error ? error.message : 'No fue posible guardar el endpoint.');
    } finally {
      this.adminLoading.set(false);
    }
  }

  protected async deleteAdminEndpoint(endpointId: number): Promise<void> {
    if (!confirm('¿Deseas eliminar este endpoint?')) {
      return;
    }

    this.adminLoading.set(true);
    this.adminNotice.set(null);

    try {
      await this.requestJson<ApiResponse<null>>(`/admin/endpoints/${endpointId}`, {
        method: 'DELETE',
      });
      await this.loadAdminWorkspace();
      this.resetAdminEndpointForm();
    } catch (error) {
      this.adminNotice.set(error instanceof Error ? error.message : 'No fue posible eliminar el endpoint.');
    } finally {
      this.adminLoading.set(false);
    }
  }

  protected async loadSchemaAccesses(schemaId: number): Promise<void> {
    this.adminAccessSchemaId = String(schemaId);
    this.adminNotice.set(null);

    try {
      const response = await this.requestJson<ApiResponse<AdminAccessItem[]>>(`/admin/schemas/${schemaId}/accesses`);
      this.adminAccesses.set(this.normalizeAccessList(response.data));
    } catch (error) {
      this.adminNotice.set(error instanceof Error ? error.message : 'No fue posible cargar los accesos.');
      this.adminAccesses.set([]);
    }
  }

  protected async grantSchemaAccess(): Promise<void> {
    const schemaId = Number(this.adminAccessSchemaId || this.adminSelectedSchemaId());
    const developerUserId = Number(this.adminAccessDeveloperUserId);

    if (!schemaId || !developerUserId) {
      this.adminNotice.set('Selecciona un schema y un developer válido.');
      return;
    }

    this.adminLoading.set(true);
    this.adminNotice.set(null);

    try {
      await this.requestJson<ApiResponse<null>>(`/admin/schemas/${schemaId}/accesses`, {
        method: 'POST',
        body: JSON.stringify({ developerUserId }),
      });
      await this.loadSchemaAccesses(schemaId);
      this.adminAccessDeveloperUserId = '';
    } catch (error) {
      this.adminNotice.set(error instanceof Error ? error.message : 'No fue posible asignar acceso.');
    } finally {
      this.adminLoading.set(false);
    }
  }

  protected async revokeSchemaAccess(developerUserId: number): Promise<void> {
    const schemaId = Number(this.adminAccessSchemaId || this.adminSelectedSchemaId());
    if (!schemaId) {
      return;
    }

    this.adminLoading.set(true);
    this.adminNotice.set(null);

    try {
      await this.requestJson<ApiResponse<null>>(`/admin/schemas/${schemaId}/accesses/${developerUserId}`, {
        method: 'DELETE',
      });
      await this.loadSchemaAccesses(schemaId);
    } catch (error) {
      this.adminNotice.set(error instanceof Error ? error.message : 'No fue posible revocar el acceso.');
    } finally {
      this.adminLoading.set(false);
    }
  }

  protected async extractAdminSchema(): Promise<void> {
    const url = this.adminImportUrl.trim();
    if (!url) {
      this.adminNotice.set('Escribe una URL OpenAPI para continuar.');
      return;
    }

    this.adminLoading.set(true);
    this.adminNotice.set(null);

    try {
      const response = await this.requestJson<ApiResponse<unknown>>('/admin/schemas/extract', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      this.adminExtractPreview.set(response.data ?? null);
      this.adminImportPreviewText = JSON.stringify(response.data ?? {}, null, 2);
    } catch (error) {
      this.adminExtractPreview.set(null);
      this.adminImportPreviewText = '';
      this.adminNotice.set(error instanceof Error ? error.message : 'No fue posible extraer el schema.');
    } finally {
      this.adminLoading.set(false);
    }
  }

  protected createSchemaFormFromPreview(): void {
    const preview = this.adminExtractPreview();
    if (!preview || typeof preview !== 'object') {
      return;
    }

    const record = preview as {
      sourceUrl?: string;
      title?: string;
      description?: string;
      version?: string;
      visibility?: 'PUBLICO' | 'PRIVADO';
      rawSchema?: unknown;
    };

    this.adminSchemaFormMode = 'create';
    this.adminSchemaEditingId = null;
    this.adminSchemaSourceUrl = record.sourceUrl ?? this.adminImportUrl ?? '';
    this.adminSchemaTitle = record.title ?? '';
    this.adminSchemaDescription = record.description ?? '';
    this.adminSchemaVersion = record.version ?? 'v1';
    this.adminSchemaVisibility = record.visibility ?? 'PUBLICO';
    this.adminSchemaRawSchemaText = JSON.stringify(record.rawSchema ?? preview, null, 2);
  }

  protected updateAdminSchemaField(field: 'sourceUrl' | 'title' | 'description' | 'version', value: string): void {
    if (field === 'sourceUrl') this.adminSchemaSourceUrl = value;
    if (field === 'title') this.adminSchemaTitle = value;
    if (field === 'description') this.adminSchemaDescription = value;
    if (field === 'version') this.adminSchemaVersion = value;
  }

  protected updateAdminSchemaVisibility(value: string): void {
    this.adminSchemaVisibility = value === 'PRIVADO' ? 'PRIVADO' : 'PUBLICO';
  }

  protected updateAdminSchemaRawSchema(value: string): void {
    this.adminSchemaRawSchemaText = value;
  }

  protected updateAdminEndpointField(
    field:
      | 'schemaId'
      | 'path'
      | 'summary'
      | 'description'
      | 'operationId'
      | 'tags'
      | 'status',
    value: string,
  ): void {
    if (field === 'schemaId') this.adminEndpointSchemaId = value;
    if (field === 'path') this.adminEndpointPath = value;
    if (field === 'summary') this.adminEndpointSummary = value;
    if (field === 'description') this.adminEndpointDescription = value;
    if (field === 'operationId') this.adminEndpointOperationId = value;
    if (field === 'tags') this.adminEndpointTags = value;
    if (field === 'status') this.adminEndpointStatus = value as AdminEndpointItem['status'];
  }

  protected updateAdminEndpointMethod(value: string): void {
    this.adminEndpointMethod = this.normalizeMethod(value);
  }

  protected updateAdminEndpointDeprecated(value: boolean): void {
    this.adminEndpointDeprecated = value;
  }

  protected updateAdminEndpointParameters(value: string): void {
    this.adminEndpointParametersText = value;
  }

  protected updateAdminEndpointRequestBody(value: string): void {
    this.adminEndpointRequestBodyText = value;
  }

  protected updateAdminEndpointResponses(value: string): void {
    this.adminEndpointResponsesText = value;
  }

  protected updateAdminAccessSchemaId(value: string): void {
    this.adminAccessSchemaId = value;
  }

  protected onAdminAccessSchemaChange(value: string): void {
    this.updateAdminAccessSchemaId(value);
    void this.loadSchemaAccesses(Number(value));
  }

  protected updateAdminAccessDeveloperUserId(value: string): void {
    this.adminAccessDeveloperUserId = value;
  }

  protected updateAdminImportUrl(value: string): void {
    this.adminImportUrl = value;
  }

  private resetAdminSchemaForm(): void {
    this.adminSchemaSourceUrl = '';
    this.adminSchemaTitle = '';
    this.adminSchemaDescription = '';
    this.adminSchemaVersion = 'v1';
    this.adminSchemaVisibility = 'PUBLICO';
    this.adminSchemaRawSchemaText = `{
  "openapi": "3.1.0"
}`;
  }

  private resetAdminEndpointForm(): void {
    if (!this.adminEndpointSchemaId && this.adminSchemas().length > 0) {
      this.adminEndpointSchemaId = String(this.adminSchemas()[0].id);
    }
    this.adminEndpointPath = '';
    this.adminEndpointMethod = 'GET';
    this.adminEndpointSummary = '';
    this.adminEndpointDescription = '';
    this.adminEndpointOperationId = '';
    this.adminEndpointTags = '';
    this.adminEndpointDeprecated = false;
    this.adminEndpointStatus = 'VISIBLE';
    this.adminEndpointParametersText = '[]';
    this.adminEndpointRequestBodyText = 'null';
    this.adminEndpointResponsesText = '[]';
  }

  private parseAdminSchemaPayload():
    | {
        sourceUrl: string;
        title: string;
        description: string;
        version: string;
        visibility: 'PUBLICO' | 'PRIVADO';
        rawSchema: unknown;
      }
    | null {
    try {
      return {
        sourceUrl: this.adminSchemaSourceUrl.trim(),
        title: this.adminSchemaTitle.trim(),
        description: this.adminSchemaDescription.trim(),
        version: this.adminSchemaVersion.trim() || 'v1',
        visibility: this.adminSchemaVisibility,
        rawSchema: JSON.parse(this.adminSchemaRawSchemaText || '{}'),
      };
    } catch {
      this.adminNotice.set('El rawSchema debe ser JSON válido.');
      return null;
    }
  }

  private parseAdminEndpointPayload():
    | {
        schemaId: number;
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
    | null {
    const schemaId = Number(this.adminEndpointSchemaId);
    if (!schemaId) {
      this.adminNotice.set('Debes seleccionar un schema válido.');
      return null;
    }

    try {
      const parameters = this.adminEndpointParametersText.trim()
        ? (JSON.parse(this.adminEndpointParametersText) as DocumentedEndpoint['parameters'])
        : [];
      const requestBody = this.adminEndpointRequestBodyText.trim()
        ? (JSON.parse(this.adminEndpointRequestBodyText) as DocumentedEndpoint['requestBody'])
        : null;
      const responses = this.adminEndpointResponsesText.trim()
        ? (JSON.parse(this.adminEndpointResponsesText) as DocumentedEndpoint['responses'])
        : [];

      return {
        schemaId,
        path: this.adminEndpointPath.trim(),
        method: this.adminEndpointMethod,
        summary: this.adminEndpointSummary.trim(),
        description: this.adminEndpointDescription.trim(),
        operationId: this.adminEndpointOperationId.trim(),
        tags: this.adminEndpointTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        deprecated: this.adminEndpointDeprecated,
        status: this.adminEndpointStatus,
        parameters,
        requestBody,
        responses,
      };
    } catch {
      this.adminNotice.set('Parameters, request body y responses deben ser JSON válidos.');
      return null;
    }
  }

  private normalizeAccessList(items: unknown): AdminAccessItem[] {
    const list = Array.isArray(items) ? items : [];
    return list.map((item) => {
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
    });
  }

  protected openDeveloperLogin(): void {
    this.openLoginModal();
  }

  protected adminSchemaEndpointCount(schemaId: number): number {
    return this.adminEndpoints().filter((endpoint) => endpoint.schemaId === schemaId).length;
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

      if (user.tipoUsuario === 'ADMINISTRADOR') {
        void this.loadAdminWorkspace();
      } else if (user.tipoUsuario === 'DESARROLLADOR') {
        void this.refreshCatalog();
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
          label: endpoint.summary?.trim() || this.endpointLabelFromPath(endpoint.path, endpoint.method, endpoint.operationId),
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
        this.openServiceIds.set([]);

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
      this.notice.set('Sistema fuera de servicio temporalmente.');
    }
  }

  private endpointLabelFromPath(path: string, method: string, operationId?: string | null): string {
    const cleanOperationId = operationId?.trim();
    if (cleanOperationId) {
      return this.humanizeIdentifier(cleanOperationId);
    }

    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] ?? '';
    const subject = lastSegment.replace(/[{}]/g, ' ').replace(/[-_]/g, ' ');
    const verbs = new Map<string, string>([
      ['GET', 'Listar'],
      ['POST', 'Crear'],
      ['PUT', 'Actualizar'],
      ['DELETE', 'Eliminar'],
      ['PATCH', 'Actualizar'],
    ]);

    const verb = verbs.get(this.normalizeMethod(method)) ?? 'Obtener';
    const noun = this.humanizePhrase(subject).replace(/\bId\b$/i, '').trim();
    return noun ? `${verb} ${noun}`.replace(/\s+/g, ' ').trim() : `${verb} recurso`;
  }

  private humanizeIdentifier(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (char) => char.toUpperCase());
  }

  private humanizePhrase(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
        description: 'Payload type expected by the service.',
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
      { code: '500', description: 'The service failed to resolve the documentation payload.' },
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

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.authToken()) {
      headers['Authorization'] = `Bearer ${this.authToken()}`;
    }

    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers as Record<string, string> | undefined),
      },
    });

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

  private getDocById(id: string): EndpointDoc | undefined {
    return this.endpointDocs().find((item) => item.id === id);
  }
}
