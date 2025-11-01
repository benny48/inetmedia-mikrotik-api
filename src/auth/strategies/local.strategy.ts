import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

// kita override field username jadi "login"
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly auth: AuthService) {
    super({ usernameField: 'login', passwordField: 'password' });
  }

  async validate(login: string, password: string) {
    const user = await this.auth.validateUser(login, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user;
  }
}
