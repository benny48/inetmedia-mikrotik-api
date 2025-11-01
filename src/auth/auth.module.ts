import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

// helper: ubah "1d" | "12h" | "30m" | "45s" | "3600" -> detik (number)
function normalizeExpiresIn(input?: string): number | undefined {
  if (!input) return undefined;
  // angka murni = detik
  if (/^\d+$/.test(input)) return Number(input);
  const m = input.match(/^(\d+)\s*(d|h|m|s)$/i);
  if (!m) return Number(input); // fallback: coba parse angka
  const n = parseInt(m[1], 10);
  switch (m[2].toLowerCase()) {
    case 'd':
      return n * 86400;
    case 'h':
      return n * 3600;
    case 'm':
      return n * 60;
    case 's':
      return n;
    default:
      return undefined;
  }
}

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService): JwtModuleOptions => ({
        secret: cfg.get<string>('JWT_SECRET', 'change_me'),
        signOptions: {
          // <- kirim number (detik), bukan string
          expiresIn: normalizeExpiresIn(
            cfg.get<string>('JWT_EXPIRES_IN', '1d'),
          ),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
