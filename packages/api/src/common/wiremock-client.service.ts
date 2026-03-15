import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';

@Injectable()
export class WireMockClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const engine = this.config.get<string>('MOCK_ENGINE') ?? 'wiremock';
    const port = this.config.get<string>('MOCK_PORT') ?? '8081';
    const urlFromEnv =
      engine === 'mockoon'
        ? this.config.get<string>('MOCKOON_URL')
        : this.config.get<string>('WIREMOCK_URL');
    this.baseUrl = `${urlFromEnv ?? `http://localhost:${port}`}/__admin`;
  }

  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await firstValueFrom(
      this.http.get<T>(`${this.baseUrl}${path}`, config),
    );
    return res.data;
  }

  async post<T>(
    path: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const res = await firstValueFrom(
      this.http.post<T>(`${this.baseUrl}${path}`, data, config),
    );
    return res.data;
  }

  async put<T>(
    path: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const res = await firstValueFrom(
      this.http.put<T>(`${this.baseUrl}${path}`, data, config),
    );
    return res.data;
  }

  async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await firstValueFrom(
      this.http.delete<T>(`${this.baseUrl}${path}`, config),
    );
    return res.data;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
