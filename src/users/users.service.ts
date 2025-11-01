import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly cfg: ConfigService,
  ) {}

  async onModuleInit() {
    const email = this.cfg.get<string>('ADMIN_EMAIL');
    const password = this.cfg.get<string>('ADMIN_PASSWORD');
    const name = this.cfg.get<string>('ADMIN_NAME', 'Administrator');

    if (!email || !password) return;

    const exist = await this.repo.findOne({ where: { email } });
    if (exist) {
      this.logger.log(`Admin already exists: ${email}`);
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.repo.create({
      email,
      name,
      passwordHash,
      isActive: true,
    });
    await this.repo.save(user);
    this.logger.log(`Seeded admin user: ${email}`);
  }

  findByEmailOrUsername(login: string) {
    return this.repo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:login)', { login })
      .orWhere('LOWER(u.username) = LOWER(:login)', { login })
      .getOne();
  }

  async validatePassword(user: User, password: string) {
    return bcrypt.compare(password, user.passwordHash);
  }

  async findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }
}
