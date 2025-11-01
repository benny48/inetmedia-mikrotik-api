import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MikrotikService } from './mikrotik.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Mikrotik')
@Controller('mikrotik')
export class MikroTikController {
  constructor(private readonly mt: MikrotikService) {}

  @Get('system/resource')
  getSystemResource() {
    return this.mt.get('/system/resource');
  }

  @Get('interfaces')
  getInterfaces() {
    return this.mt.get('/interface');
  }

  // ===== Firewall Address-List =====
  @Get('firewall/address-list')
  getAddressList(@Query('list') list?: string) {
    return this.mt.get(
      '/ip/firewall/address-list',
      list ? { list } : undefined,
    );
  }

  @Post('firewall/address-list')
  addAddress(
    @Body() body: { list: string; address: string; comment?: string },
  ) {
    // CREATE via PUT ke RouterOS REST
    return this.mt.add('/ip/firewall/address-list', body);
  }

  @Put('firewall/address-list/:id/comment')
  async setAddressComment(
    @Param('id') id: string,
    @Body() body: { comment: string },
  ) {
    if (!body?.comment) {
      throw new BadRequestException('Field "comment" wajib diisi');
    }
    return this.mt.patch('/ip/firewall/address-list', id, {
      comment: body.comment,
    });
  }

  @Delete('firewall/address-list/:id')
  deleteAddress(@Param('id') id: string) {
    return this.mt.delete('/ip/firewall/address-list', id);
  }

  // ===== Script Runner =====
  @Post('script/run')
  runScript(@Body() body: { source: string }) {
    return this.mt.runScript(body.source);
  }

  // ===== PPPoE Secrets =====
  @Get('pppoe/secrets')
  async listPppoeSecrets(
    @Query('service') service?: string, // 'pppoe' atau 'any'
    @Query('profile') profile?: string,
    @Query('disabled') disabled?: 'true' | 'false',
    @Query('name') name?: string,
    @Query('comment') comment?: string,
  ) {
    const params: Record<string, any> = {};
    if (service) params.service = service;
    if (profile) params.profile = profile;
    if (disabled) params.disabled = disabled;
    if (name) params.name = name;
    if (comment) params.comment = comment;

    const data = await this.mt.get<any[]>(
      '/ppp/secret',
      Object.keys(params).length ? params : undefined,
    );

    // amankan: jangan expose password
    return Array.isArray(data)
      ? data.map(({ password, ...rest }) => rest)
      : data;
  }

  // finder partial (case-insensitive)
  @Get('pppoe/secrets/find')
  async findSecrets(
    @Query('q') q?: string,
    @Query('service') service?: 'pppoe' | 'any',
    @Query('limit') limit = '20',
  ) {
    const params: Record<string, any> = {};
    if (service) params.service = service;
    const all = await this.mt.get<any[]>(
      '/ppp/secret',
      Object.keys(params).length ? params : undefined,
    );
    let list = Array.isArray(all) ? all : [];
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((it: any) =>
        (it?.name || '').toString().toLowerCase().includes(s),
      );
    }
    const n = Math.max(1, Math.min(Number(limit) || 20, 100));
    return list.slice(0, n).map(({ password, ...rest }) => rest);
  }

  // update profile by name (PUT di API kita, PATCH ke RouterOS)
  @Put('pppoe/secrets/:name/profile')
  async updatePppoeSecretProfileByName(
    @Param('name') name: string,
    @Body() body: { profile?: string },
    @Query('service') service?: 'pppoe' | 'any',
    @Query('exact') exact: 'true' | 'false' = 'true',
  ) {
    if (!body?.profile) {
      throw new BadRequestException('Field "profile" wajib diisi');
    }

    const target = (name || '').trim();
    if (!target) {
      throw new BadRequestException('Parameter :name tidak boleh kosong');
    }

    // 1) exact match via GET
    const paramsExact: Record<string, any> = { name: target };
    if (service) paramsExact.service = service;

    let rows = await this.mt.get<any[]>('/ppp/secret', paramsExact);

    // 2) fallback partial
    if ((!rows || rows.length === 0) && exact === 'false') {
      const paramsList: Record<string, any> = {};
      if (service) paramsList.service = service;
      const all = await this.mt.get<any[]>(
        '/ppp/secret',
        Object.keys(paramsList).length ? paramsList : undefined,
      );
      const q = target.toLowerCase();
      rows = (all || []).filter((it: any) =>
        (it?.name || '').toString().toLowerCase().includes(q),
      );
    }

    if (!rows || rows.length === 0) {
      const sample = await this.mt.get<any[]>(
        '/ppp/secret',
        service ? { service } : undefined,
      );
      const suggestions = (sample || [])
        .map((it: any) => it?.name)
        .filter(Boolean)
        .slice(0, 10);
      throw new NotFoundException({
        message: `PPP secret dengan name="${target}" tidak ditemukan`,
        hints: {
          tryWith: [
            `PUT /mikrotik/pppoe/secrets/${encodeURIComponent(
              target,
            )}/profile?exact=false`,
            `PUT /mikrotik/pppoe/secrets/${encodeURIComponent(
              target,
            )}/profile?service=pppoe`,
          ],
          samples: suggestions,
        },
      });
    }

    if (rows.length > 1) {
      const names = rows
        .map((r: any) => r?.name)
        .filter(Boolean)
        .slice(0, 10);
      throw new BadRequestException({
        message: `Ditemukan ${rows.length} secret cocok dengan "${target}". Persempit pencarian (exact=true atau tambah service/profile).`,
        matches: names,
      });
    }

    const id = rows[0]?.['.id'];
    if (!id) throw new BadRequestException('Tidak menemukan .id pada secret');

    const updated = await this.mt.patch('/ppp/secret', id, {
      profile: body.profile,
    });

    return {
      ok: true,
      name: rows[0]?.name,
      id,
      profile: body.profile,
      updated,
    };
  }

  // ===== PPP Profiles =====
  @Get('pppoe/profiles')
  async listPppProfiles(
    @Query('name') name?: string,
    @Query('only-one') onlyOne?: 'true' | 'false',
    @Query('rate-limit') rateLimit?: string,
    @Query('local-address') localAddress?: string,
    @Query('remote-address') remoteAddress?: string,
    @Query('comment') comment?: string,
  ) {
    const params: Record<string, any> = {};
    if (name) params['name'] = name;
    if (onlyOne) params['only-one'] = onlyOne; // key dash tetap string
    if (rateLimit) params['rate-limit'] = rateLimit;
    if (localAddress) params['local-address'] = localAddress;
    if (remoteAddress) params['remote-address'] = remoteAddress;
    if (comment) params['comment'] = comment;

    return this.mt.get<any[]>(
      '/ppp/profile',
      Object.keys(params).length ? params : undefined,
    );
  }

  // ===== CREATE PPP SECRET (PPPoE) =====
  // POST /mikrotik/pppoe/secrets?upsert=true|false
  @Post('pppoe/secrets')
  async createPppoeSecret(
    @Body()
    body: {
      name?: string;
      password?: string;
      service?: 'pppoe' | 'any';
      profile?: string;
      localAddress?: string;
      remoteAddress?: string;
      callerId?: string;
      comment?: string;
      disabled?: 'true' | 'false' | boolean;
    },
    @Query('upsert') upsert: 'true' | 'false' = 'false',
  ) {
    const { name, password } = body || {};
    if (!name || !password) {
      throw new BadRequestException('Field "name" dan "password" wajib diisi');
    }

    // cek existing by name (+service jika ada)
    const findParams: Record<string, any> = { name };
    if (body.service) findParams.service = body.service;
    const exists = await this.mt.get<any[]>('/ppp/secret', findParams);

    // rakit payload (skip field kosong)
    const payload: Record<string, any> = { name, password };
    if (body.service) payload.service = body.service; // 'pppoe' | 'any'
    if (body.profile) payload.profile = body.profile;
    if (body.localAddress) payload['local-address'] = body.localAddress;
    if (body.remoteAddress) payload['remote-address'] = body.remoteAddress;
    if (body.callerId) payload['caller-id'] = body.callerId;
    if (typeof body.comment === 'string' && body.comment.length > 0) {
      payload.comment = body.comment;
    }
    const disabledStr =
      typeof body.disabled === 'boolean'
        ? body.disabled
          ? 'true'
          : 'false'
        : body.disabled;
    if (disabledStr !== undefined) {
      payload.disabled = disabledStr; // 'true' | 'false'
    }

    if (Array.isArray(exists) && exists.length > 0) {
      if (upsert === 'true') {
        if (exists.length > 1) {
          const names = exists
            .map((x) => x?.name)
            .filter(Boolean)
            .slice(0, 10);
          throw new BadRequestException({
            message: `Ditemukan ${exists.length} secret dengan name="${name}". Persempit (tambahkan service atau pastikan unik).`,
            matches: names,
          });
        }
        const id = exists[0]?.['.id'];
        if (!id)
          throw new BadRequestException(
            'Tidak menemukan .id pada secret existing',
          );
        const updated = await this.mt.patch('/ppp/secret', id, payload);
        const { password: _pw, ...rest } = updated || {};
        return { ok: true, mode: 'updated', id, ...rest };
      }
      throw new BadRequestException(
        `PPP secret "${name}" sudah ada. Tambahkan ?upsert=true untuk update.`,
      );
    }

    // CREATE baru → PUT /rest/ppp/secret
    const created = await this.mt.add('/ppp/secret', payload);
    const { password: _pw, ...rest } = created || {};
    return { ok: true, mode: 'created', ...rest };
  }

  @Post('pppoe/profiles')
  async createPppProfile(
    @Body()
    body: {
      name?: string;
      rateLimit?: string;
      localAddress?: string;
      remoteAddress?: string;
      onlyOne?: 'true' | 'false' | boolean;
      changeTcpMss?: 'true' | 'false' | boolean;
      dnsServer?: string;
      winsServer?: string;
      onUp?: string;
      onDown?: string;
      comment?: string;
    },
    @Query('upsert') upsert: 'true' | 'false' = 'false',
  ) {
    const { name } = body || {};
    if (!name) {
      throw new BadRequestException('Field "name" wajib diisi');
    }

    // cek existing by exact name
    const exists = await this.mt.get<any[]>('/ppp/profile', { name });

    // helper konversi boolean → 'true'|'false'
    const boolToStr = (v: any) =>
      typeof v === 'boolean' ? (v ? 'true' : 'false') : v;

    // rakit payload (skip field kosong)
    const payload: Record<string, any> = { name };
    if (body.rateLimit) payload['rate-limit'] = body.rateLimit;
    if (body.localAddress) payload['local-address'] = body.localAddress;
    if (body.remoteAddress) payload['remote-address'] = body.remoteAddress;

    const onlyOneStr = boolToStr(body.onlyOne);
    if (onlyOneStr !== undefined) payload['only-one'] = onlyOneStr;

    const changeTcpMssStr = boolToStr(body.changeTcpMss);
    if (changeTcpMssStr !== undefined)
      payload['change-tcp-mss'] = changeTcpMssStr;

    if (typeof body.dnsServer === 'string' && body.dnsServer.length > 0)
      payload['dns-server'] = body.dnsServer;
    if (typeof body.winsServer === 'string' && body.winsServer.length > 0)
      payload['wins-server'] = body.winsServer;
    if (typeof body.onUp === 'string' && body.onUp.length > 0)
      payload['on-up'] = body.onUp;
    if (typeof body.onDown === 'string' && body.onDown.length > 0)
      payload['on-down'] = body.onDown;
    if (typeof body.comment === 'string' && body.comment.length > 0)
      payload.comment = body.comment;

    // UPSERT jika sudah ada
    if (Array.isArray(exists) && exists.length > 0) {
      if (upsert === 'true') {
        if (exists.length > 1) {
          const names = exists
            .map((x) => x?.name)
            .filter(Boolean)
            .slice(0, 10);
          throw new BadRequestException({
            message: `Ditemukan ${exists.length} profile dengan name="${name}". Pastikan unik dulu.`,
            matches: names,
          });
        }
        const id = exists[0]?.['.id'];
        if (!id)
          throw new BadRequestException(
            'Tidak menemukan .id pada profile existing',
          );
        const updated = await this.mt.patch('/ppp/profile', id, payload);
        return { ok: true, mode: 'updated', id, updated };
      }
      throw new BadRequestException(
        `PPP profile "${name}" sudah ada. Tambahkan ?upsert=true untuk update.`,
      );
    }

    // CREATE baru → PUT /rest/ppp/profile
    const created = await this.mt.add('/ppp/profile', payload);
    return { ok: true, mode: 'created', created };
  }
}
