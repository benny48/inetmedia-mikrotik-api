import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CustomersService } from './customers.service';

@Injectable()
export class BillingScheduler {
  private readonly logger = new Logger(BillingScheduler.name);

  constructor(private readonly svc: CustomersService) {}

  // Cek setiap hari jam 01:00 WIB
  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    timeZone: 'Asia/Jakarta',
  })
  async runDaily() {
    try {
      const res = await this.svc.enforceIsolationNow();
      this.logger.log(
        `Billing check done: customers=${res.customersChecked}, isolated=${res.accountsIsolated}, skipped=${res.customersPaidOrNoDue}`,
      );
    } catch (e) {
      this.logger.error(`Billing check failed: ${e?.message || e}`);
    }
  }
}
