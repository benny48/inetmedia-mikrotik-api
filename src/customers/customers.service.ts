import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { PppoeAccount } from './entities/pppoe-account.entity';
import { Payment } from './entities/payment.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreatePppoeDto } from './dto/create-pppoe.dto';
import { UpdatePppoeDto } from './dto/update-pppoe.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { MikrotikService } from '../mikrotik/mikrotik.service';
import { ConfigService } from '@nestjs/config';

function yyyymmdd(d: Date): string {
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function addMonthsKeepDay(
  dateStr: string,
  months: number,
  fallbackDay?: number,
): string {
  const d = new Date(dateStr + 'T00:00:00');
  const y = d.getFullYear();
  const m = d.getMonth();
  const target = new Date(y, m + months, 1);
  const day = fallbackDay ?? d.getDate();
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(day, lastDay));
  return yyyymmdd(target);
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);
  private readonly isolirProfile: string;

  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(PppoeAccount)
    private readonly pppoes: Repository<PppoeAccount>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly ds: DataSource,
    private readonly mt: MikrotikService,
    private readonly cfg: ConfigService,
  ) {
    this.isolirProfile = this.cfg.get('ISOLIR_PROFILE_NAME', 'ISOLIRBILLING');
  }

  // ===== Customers =====
  listCustomers() {
    return this.customers.find({
      relations: { pppoeAccounts: true },
      order: { createdAt: 'DESC' },
    });
  }

  getCustomer(id: string) {
    return this.customers.findOne({
      where: { id },
      relations: { pppoeAccounts: true },
    });
  }

  async createCustomer(dto: CreateCustomerDto) {
    const exist = await this.customers.findOne({ where: { code: dto.code } });
    if (exist)
      throw new BadRequestException(
        `Customer code "${dto.code}" already exists`,
      );
    const cust = this.customers.create({
      ...dto,
      subscriptionFee: dto.subscriptionFee ?? 0,
    });
    // set dueDate awal kalau ada billingDueDay
    if (!cust.dueDate && (cust as any).billingDueDay) {
      const billingDueDay = (cust as any).billingDueDay as number;
      const today = new Date();
      const base = new Date(
        today.getFullYear(),
        today.getMonth(),
        billingDueDay,
      );
      cust.dueDate = yyyymmdd(
        base >= today
          ? base
          : new Date(today.getFullYear(), today.getMonth() + 1, billingDueDay),
      );
    }
    return this.customers.save(cust);
  }

  async updateCustomer(
    id: string,
    dto: UpdateCustomerDto & { dueDate?: string; billingDueDay?: number },
  ) {
    const c = await this.customers.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Customer not found');
    Object.assign(c, dto);
    if (dto.subscriptionFee !== undefined)
      c.subscriptionFee = dto.subscriptionFee;
    if (dto.dueDate !== undefined)
      (c as any).dueDate = dto.dueDate || undefined;
    if (dto.billingDueDay !== undefined)
      (c as any).billingDueDay = dto.billingDueDay || undefined;
    return this.customers.save(c);
  }

  async deleteCustomer(id: string) {
    await this.customers.delete({ id });
    return { ok: true };
  }

  // ===== PPPoE Accounts =====
  async listPppoeByCustomer(customerId: string) {
    const customer = await this.customers.findOne({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return this.pppoes.find({ where: { customer: { id: customerId } } as any });
  }

  async createPppoe(customerId: string, dto: CreatePppoeDto) {
    const customer = await this.customers.findOne({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const exist = await this.pppoes.findOne({ where: { name: dto.name } });
    if (exist)
      throw new BadRequestException(
        `PPPoE username "${dto.name}" already exists`,
      );

    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // create secret di RouterOS (PUT)
      const payload: Record<string, any> = {
        name: dto.name,
        password: dto.password,
      };
      if (dto.service) payload.service = dto.service;
      if (dto.profile) payload.profile = dto.profile;
      if (dto.localAddress) payload['local-address'] = dto.localAddress;
      if (dto.remoteAddress) payload['remote-address'] = dto.remoteAddress;
      if (dto.callerId) payload['caller-id'] = dto.callerId;
      if (dto.comment) payload.comment = dto.comment;
      if (typeof dto.disabled === 'boolean')
        payload.disabled = dto.disabled ? 'true' : 'false';

      // pastikan MikrotikService punya method add() untuk PUT
      const created = await (this.mt as any).add('/ppp/secret', payload);
      const mikrotikId = created?.['.id'];

      const acc = qr.manager.create(PppoeAccount, {
        customer,
        name: dto.name,
        profile: dto.profile,
        service: dto.service || 'pppoe',
        disabled: !!dto.disabled,
        localAddress: dto.localAddress,
        remoteAddress: dto.remoteAddress,
        callerId: dto.callerId,
        comment: dto.comment,
        mikrotikId,
      });
      await qr.manager.save(acc);

      await qr.commitTransaction();
      return { ok: true, account: { ...acc, password: undefined } };
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async updatePppoe(
    customerId: string,
    accountId: string,
    dto: UpdatePppoeDto,
  ) {
    const acc = await this.pppoes.findOne({
      where: { id: accountId },
      relations: { customer: true },
    });
    if (!acc || acc.customer.id !== customerId)
      throw new NotFoundException('Account not found');

    // cari .id bila kosong
    let mikId = acc.mikrotikId;
    if (!mikId) {
      const rows = await this.mt.get<any[]>('/ppp/secret', {
        name: acc.name,
        service: acc.service,
      });
      mikId = rows?.[0]?.['.id'];
      if (mikId) acc.mikrotikId = mikId;
      if (!acc.profile && rows?.[0]?.profile) acc.profile = rows[0].profile;
    }
    if (!mikId) throw new NotFoundException('Router secret not found to patch');

    const patch: Record<string, any> = {};
    if (dto.password) patch.password = dto.password;
    if (dto.profile) patch.profile = dto.profile;
    if (typeof dto.disabled === 'boolean')
      patch.disabled = dto.disabled ? 'true' : 'false';
    if (dto.localAddress) patch['local-address'] = dto.localAddress;
    if (dto.remoteAddress) patch['remote-address'] = dto.remoteAddress;
    if (dto.callerId) patch['caller-id'] = dto.callerId;
    if (dto.comment !== undefined) patch.comment = dto.comment;

    if (Object.keys(patch).length > 0) {
      await this.mt.patch('/ppp/secret', mikId, patch);
    }

    Object.assign(acc, {
      profile: dto.profile ?? acc.profile,
      disabled: typeof dto.disabled === 'boolean' ? dto.disabled : acc.disabled,
      localAddress: dto.localAddress ?? acc.localAddress,
      remoteAddress: dto.remoteAddress ?? acc.remoteAddress,
      callerId: dto.callerId ?? acc.callerId,
      comment: dto.comment ?? acc.comment,
    });
    await this.pppoes.save(acc);
    return { ok: true, account: { ...acc, password: undefined } };
  }

  async deletePppoe(customerId: string, accountId: string) {
    const acc = await this.pppoes.findOne({
      where: { id: accountId },
      relations: { customer: true },
    });
    if (!acc || acc.customer.id !== customerId)
      throw new NotFoundException('Account not found');

    let mikId = acc.mikrotikId;
    if (!mikId) {
      const rows = await this.mt.get<any[]>('/ppp/secret', {
        name: acc.name,
        service: acc.service,
      });
      mikId = rows?.[0]?.['.id'];
    }
    if (mikId) {
      await this.mt.delete('/ppp/secret', mikId).catch(() => void 0);
    }

    await this.pppoes.delete({ id: acc.id });
    return { ok: true };
  }

  // ===== Payments =====
  async listPayments(customerId: string, paidOnly = true) {
    const customer = await this.customers.findOne({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return this.payments.find({
      where: paidOnly
        ? ({ customer: { id: customerId }, paid: true } as any)
        : ({ customer: { id: customerId } } as any),
      order: { paidAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async createPayment(customerId: string, dto: CreatePaymentDto) {
    const c = await this.customers.findOne({ where: { id: customerId } });
    if (!c) throw new NotFoundException('Customer not found');

    const paid = dto.paid ?? true;
    const paidAt: Date | null = dto.paidAt
      ? new Date(dto.paidAt)
      : paid
        ? new Date()
        : null;

    const p = this.payments.create({
      customer: c,
      amount: dto.amount,
      paid,
      paidAt, // <-- null-safe
      method: dto.method,
      reference: dto.reference,
      description: dto.description,
      periodMonth: dto.periodMonth,
      periodYear: dto.periodYear,
    });
    const saved = await this.payments.save(p);

    // jika dibayar → un-isolate & majukan dueDate
    if (paid) {
      await this.unisolateCustomerIfAny(c.id).catch((e) =>
        this.logger.warn(
          `Unisolate after payment failed for customer=${c.id}: ${e?.message || e}`,
        ),
      );
      if ((c as any).dueDate) {
        const next = addMonthsKeepDay(
          (c as any).dueDate,
          1,
          (c as any).billingDueDay || undefined,
        );
        await this.customers.update({ id: c.id }, { dueDate: next as any });
      }
    }
    return saved;
  }

  async updatePayment(
    customerId: string,
    paymentId: string,
    dto: UpdatePaymentDto,
  ) {
    const p = await this.payments.findOne({
      where: { id: paymentId },
      relations: { customer: true },
    });
    if (!p || p.customer.id !== customerId)
      throw new NotFoundException('Payment not found');

    if (dto.amount !== undefined) p.amount = dto.amount;

    if (dto.paid !== undefined) {
      p.paid = dto.paid;
      if (dto.paid) {
        if (!p.paidAt) p.paidAt = new Date();
      } else {
        if (dto.paidAt === undefined) p.paidAt = null; // kosongkan jika jadi unpaid
      }
    }

    if (dto.paidAt !== undefined) {
      p.paidAt = dto.paidAt ? new Date(dto.paidAt) : null; // gunakan null, bukan undefined
    }

    if (dto.method !== undefined) p.method = dto.method;
    if (dto.reference !== undefined) p.reference = dto.reference;
    if (dto.description !== undefined) p.description = dto.description;
    if (dto.periodMonth !== undefined) p.periodMonth = dto.periodMonth;
    if (dto.periodYear !== undefined) p.periodYear = dto.periodYear;

    const saved = await this.payments.save(p);

    if (p.paid) {
      await this.unisolateCustomerIfAny(p.customer.id).catch((e) =>
        this.logger.warn(
          `Unisolate after payment failed for customer=${p.customer.id}: ${e?.message || e}`,
        ),
      );
      const c = await this.customers.findOne({ where: { id: p.customer.id } });
      if (c && (c as any).dueDate) {
        const next = addMonthsKeepDay(
          (c as any).dueDate,
          1,
          (c as any).billingDueDay || undefined,
        );
        await this.customers.update({ id: c.id }, { dueDate: next as any });
      }
    }

    return saved;
  }

  async deletePayment(customerId: string, paymentId: string) {
    const p = await this.payments.findOne({
      where: { id: paymentId },
      relations: { customer: true },
    });
    if (!p || p.customer.id !== customerId)
      throw new NotFoundException('Payment not found');
    await this.payments.delete({ id: paymentId });
    return { ok: true };
  }

  async markPaymentPaid(customerId: string, paymentId: string) {
    const p = await this.payments.findOne({
      where: { id: paymentId },
      relations: { customer: true },
    });
    if (!p || p.customer.id !== customerId)
      throw new NotFoundException('Payment not found');
    p.paid = true;
    p.paidAt = p.paidAt ?? new Date();
    const saved = await this.payments.save(p);

    await this.unisolateCustomerIfAny(customerId).catch(() => {});
    const c = await this.customers.findOne({ where: { id: customerId } });
    if (c && (c as any).dueDate) {
      const next = addMonthsKeepDay(
        (c as any).dueDate,
        1,
        (c as any).billingDueDay || undefined,
      );
      await this.customers.update({ id: c.id }, { dueDate: next as any });
    }
    return saved;
  }

  // ====== AUTO-ISOLIR ENGINE ======
  private async isPaidForPeriod(
    customerId: string,
    month: number,
    year: number,
  ) {
    const hasTagged = await this.payments.exist({
      where: {
        customer: { id: customerId } as any,
        paid: true,
        periodMonth: month,
        periodYear: year,
      },
    });
    if (hasTagged) return true;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const count = await this.payments
      .createQueryBuilder('p')
      .where('p."customerId" = :cid', { cid: customerId })
      .andWhere('p.paid = true')
      .andWhere('p.paidAt IS NOT NULL')
      .andWhere('p.paidAt >= :start AND p.paidAt < :end', { start, end })
      .getCount();
    return count > 0;
  }

  async enforceIsolationNow() {
    const today = new Date();
    const todayStr = yyyymmdd(today);

    const candidates = await this.customers.find({
      where: {},
      relations: { pppoeAccounts: true },
    });

    let customersChecked = 0;
    let customersPaidOrNoDue = 0;
    let accountsIsolated = 0;

    for (const c of candidates) {
      if (!(c as any).dueDate) {
        customersPaidOrNoDue++;
        continue;
      }
      if ((c as any).dueDate > todayStr) {
        customersPaidOrNoDue++;
        continue;
      }

      const due = new Date((c as any).dueDate + 'T00:00:00');
      const paid = await this.isPaidForPeriod(
        c.id,
        due.getMonth() + 1,
        due.getFullYear(),
      );
      customersChecked++;

      if (paid) {
        const next = addMonthsKeepDay(
          (c as any).dueDate,
          1,
          (c as any).billingDueDay || undefined,
        );
        await this.customers.update({ id: c.id }, { dueDate: next as any });
        continue;
      }

      const accounts = await this.pppoes.find({
        where: { customer: { id: c.id } } as any,
      });
      for (const acc of accounts) {
        try {
          let mikId = acc.mikrotikId;
          if (!mikId) {
            const rows = await this.mt.get<any[]>('/ppp/secret', {
              name: acc.name,
              service: acc.service,
            });
            mikId = rows?.[0]?.['.id'];
            if (mikId) acc.mikrotikId = mikId;
            if (!acc.profile && rows?.[0]?.profile)
              acc.profile = rows[0].profile;
          }

          const previous = acc.profile || undefined;
          await this.mt.patch('/ppp/secret', mikId!, {
            profile: this.isolirProfile,
          });
          acc.previousProfile = previous;
          acc.profile = this.isolirProfile;
          acc.isIsolated = true;
          await this.pppoes.save(acc);
          accountsIsolated++;
        } catch (e) {
          this.logger.warn(
            `Failed to isolate PPPoE ${acc.name}: ${e?.message || e}`,
          );
        }
      }

      const next = addMonthsKeepDay(
        (c as any).dueDate,
        1,
        (c as any).billingDueDay || undefined,
      );
      await this.customers.update({ id: c.id }, { dueDate: next as any });
    }

    return {
      date: todayStr,
      customersChecked,
      customersPaidOrNoDue,
      accountsIsolated,
    };
  }

  private async unisolateCustomerIfAny(customerId: string) {
    const accounts = await this.pppoes.find({
      where: { customer: { id: customerId } as any, isIsolated: true },
    });
    for (const acc of accounts) {
      const restore = acc.previousProfile;
      if (!restore) continue;
      try {
        let mikId = acc.mikrotikId;
        if (!mikId) {
          const rows = await this.mt.get<any[]>('/ppp/secret', {
            name: acc.name,
            service: acc.service,
          });
          mikId = rows?.[0]?.['.id'];
          if (mikId) acc.mikrotikId = mikId;
        }
        if (mikId) {
          await this.mt.patch('/ppp/secret', mikId, { profile: restore });
          acc.profile = restore;
          acc.isIsolated = false;
          await this.pppoes.save(acc);
        }
      } catch (e) {
        this.logger.warn(
          `Failed to un-isolate PPPoE ${acc.name}: ${e?.message || e}`,
        );
      }
    }
  }
}
