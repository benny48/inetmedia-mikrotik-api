// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikrotikModule } from './mikrotik/mikrotik.module';
import { DatabaseModule } from './database/database.module';
import { CustomersModule } from './customers/customers.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // load .env dan jadikan ConfigService global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),

    // modul mikrotik kamu (di src/mikrotik)
    MikrotikModule,

    DatabaseModule,

    CustomersModule,

    UsersModule,

    AuthModule,
  ],
  // Kalau kamu masih punya AppController/AppService, boleh ditambahkan di sini.
  // controllers: [AppController],
  // providers: [AppService],
})
export class AppModule {}
