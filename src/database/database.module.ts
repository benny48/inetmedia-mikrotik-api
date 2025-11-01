import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('PG_HOST', '127.0.0.1'),
        port: parseInt(cfg.get('PG_PORT', '5433'), 10),
        username: cfg.get('PG_USER', 'postgres'),
        password: cfg.get('PG_PASSWORD', 'postgres'),
        database: cfg.get('PG_DB', 'appdb'),
        autoLoadEntities: true, // penting kalau tidak pakai entities: [...]
        synchronize: true, // DEV only
      }),
    }),
  ],
  // Export TypeOrmModule supaya modul lain tetap bisa resolve connection tokens
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
