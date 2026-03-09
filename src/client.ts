import axios, { AxiosInstance } from 'axios';
import type { EnvironmentConfig, N8NWorkflow, N8NListResponse } from './types';

export class N8NClient {
  private readonly http: AxiosInstance;
  readonly baseURL: string;

  constructor(env: EnvironmentConfig) {
    this.baseURL = env.url.replace(/\/$/, '');
    this.http = axios.create({
      baseURL: `${this.baseURL}/api/v1`,
      headers: {
        'X-N8N-API-KEY': env.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    });
  }

  async listWorkflows(): Promise<N8NWorkflow[]> {
    const results: N8NWorkflow[] = [];
    let cursor: string | null | undefined = undefined;

    do {
      const params: Record<string, unknown> = { limit: 250 };
      if (cursor) params['cursor'] = cursor;

      const response = await this.http.get<N8NListResponse<N8NWorkflow>>('/workflows', { params });
      results.push(...response.data.data);
      cursor = response.data.nextCursor;
    } while (cursor);

    return results;
  }

  async getWorkflow(id: string | number): Promise<N8NWorkflow> {
    const response = await this.http.get<N8NWorkflow>(`/workflows/${id}`);
    return response.data;
  }

  async createWorkflow(
    data: Omit<N8NWorkflow, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<N8NWorkflow> {
    const response = await this.http.post<N8NWorkflow>('/workflows', data);
    return response.data;
  }

  async updateWorkflow(
    id: string | number,
    data: Partial<Omit<N8NWorkflow, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<N8NWorkflow> {
    const response = await this.http.put<N8NWorkflow>(`/workflows/${id}`, data);
    return response.data;
  }

  async activateWorkflow(id: string | number): Promise<N8NWorkflow> {
    const response = await this.http.post<N8NWorkflow>(`/workflows/${id}/activate`);
    return response.data;
  }

  async deactivateWorkflow(id: string | number): Promise<N8NWorkflow> {
    const response = await this.http.post<N8NWorkflow>(`/workflows/${id}/deactivate`);
    return response.data;
  }
}
