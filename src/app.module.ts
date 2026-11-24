import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './modules/usuarios/users.module';
import { PixModule } from './pix/pix.module';
import { DbModule } from './db/db.module';
import { BankAccountModule } from './bank-account/bank-account.module';
import { NotificationModule } from './notification/notification.module';
import { ReportsModule } from './pix/reports/reports.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { createLoggerConfig } from './observability/logger.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(createLoggerConfig()),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 120),
      },
    ]),
    DbModule,
    AuthModule,
    PixModule,
    BankAccountModule,
    UsersModule,
    NotificationModule,
    ReportsModule,
    HealthModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
