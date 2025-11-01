import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(login: string, password: string) {
    const user = await this.users.findByEmailOrUsername(login);
    if (!user || !user.isActive) return null;
    const ok = await this.users.validatePassword(user, password);
    if (!ok) return null;
    return user;
  }

  async login(user: { id: string; email: string; name: string }) {
    const payload = { sub: user.id, email: user.email, name: user.name };
    return {
      access_token: await this.jwt.signAsync(payload),
      user: payload,
    };
  }
}
