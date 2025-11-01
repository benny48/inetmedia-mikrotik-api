import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';

@Injectable()
export class MikrotikService {
  private client: AxiosInstance;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const baseURL = this.config
      .get<string>('MIKROTIK_REST_BASE_URL', '')
      .replace(/\/+$/, '');
    if (!baseURL) throw new Error('MIKROTIK_REST_BASE_URL is required');

    const username = this.config.get<string>('MIKROTIK_USER', '');
    const password = this.config.get<string>('MIKROTIK_PASSWORD', '');
    const insecure =
      this.config.get<string>('MIKROTIK_REST_INSECURE', 'false') === 'true';

    this.client = axios.create({
      baseURL: `${baseURL}/rest`,
      auth: { username, password },
      httpsAgent: new https.Agent({ rejectUnauthorized: !insecure }),
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      validateStatus: () => true,
    });
  }

  async get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    const res = await this.client.get(this.clean(path), { params });
    this.ensureOk(res.status, res.data);
    return res.data;
  }

  /** Beberapa endpoint khusus (mis. /system/script/run) memang butuh POST */
  async post<T = any>(path: string, body: any): Promise<T> {
    const res = await this.client.post(this.clean(path), body);
    this.ensureOk(res.status, res.data);
    return res.data;
  }

  /** CREATE (RouterOS REST): PUT /rest/<path> */
  async add<T = any>(path: string, body: any): Promise<T> {
    const res = await this.client.put(this.clean(path), body);
    this.ensureOk(res.status, res.data);
    return res.data;
  }

  /** UPDATE (RouterOS REST): PATCH /rest/<path>/<id> */
  async patch<T = any>(path: string, id: string, body: any): Promise<T> {
    const res = await this.client.patch(
      `${this.clean(path)}/${encodeURIComponent(id)}`,
      body,
    );
    this.ensureOk(res.status, res.data);
    return res.data;
  }

  async delete<T = any>(path: string, id: string): Promise<T> {
    const res = await this.client.delete(
      `${this.clean(path)}/${encodeURIComponent(id)}`,
    );
    this.ensureOk(res.status, res.data);
    return res.data;
  }

  async runScript(source: string) {
    // 1) create script → PUT /system/script
    const created = await this.add<{ '.id': string }>(`/system/script`, {
      name: 'tmp-rest-run',
      source,
    });
    const id = created?.['.id'];
    if (!id) throw new BadRequestException('Gagal membuat script sementara');

    try {
      // 2) run → POST /system/script/run
      await this.post(`/system/script/run`, { number: id });
    } finally {
      // 3) cleanup
      await this.delete('/system/script', id).catch(() => void 0);
    }
    return { ok: true };
  }

  private clean(p: string) {
    return `/${p.replace(/^\/+/, '')}`;
  }

  private ensureOk(status: number, data: any) {
    if (status === 401)
      throw new UnauthorizedException('Unauthorized to MikroTik REST');
    if (status < 200 || status >= 300) {
      const detail =
        typeof data === 'object' && data
          ? data.detail || JSON.stringify(data)
          : String(data);
      throw new BadRequestException(
        `MikroTik REST error (${status}): ${detail}`,
      );
    }
  }
}
