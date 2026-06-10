import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { STORAGE_TOKEN_KEY } from '../constants/storage-keys';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async get<T>(path: string): Promise<T> {
    return this.http
      .get<T>(`${this.apiBaseUrl}${path}`, {
        headers: this.getAuthHeaders(),
      })
      .toPromise()
      .then(data => data!)
      .catch(error => this.handleError(error));
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.http
      .post<T>(`${this.apiBaseUrl}${path}`, body, {
        headers: this.getAuthHeaders(),
      })
      .toPromise()
      .then(data => data!)
      .catch(error => this.handleError(error));
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.http
      .put<T>(`${this.apiBaseUrl}${path}`, body, {
        headers: this.getAuthHeaders(),
      })
      .toPromise()
      .then(data => data!)
      .catch(error => this.handleError(error));
  }

  async delete<T>(path: string): Promise<T> {
    return this.http
      .delete<T>(`${this.apiBaseUrl}${path}`, {
        headers: this.getAuthHeaders(),
      })
      .toPromise()
      .then(data => data!)
      .catch(error => this.handleError(error));
  }

  private handleError(error: HttpErrorResponse): never {
    let message = `Request failed with status ${error.status}`;
    try {
      const body = error.error as { message?: string };
      message = body.message ?? message;
    } catch {
      // Ignore invalid JSON errors.
    }
    throw new Error(message);
  }
}
