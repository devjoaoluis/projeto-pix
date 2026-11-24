import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/usuarios/users.module';
import { PixModule } from './pix/pix.module';
import { DbModule } from './db/db.module';
import { BankAccountModule } from './bank-account/bank-account.module';
import { NotificationModule } from './notification/notification.module';
import { ReportsModule } from './pix/reports/reports.module';
import { HealthModule } from './health/health.module';
import { createLoggerConfig } from './observability/logger.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(createLoggerConfig()),
    ScheduleModule.forRoot(),
    PixModule,
    DbModule,
    BankAccountModule,
    UsersModule,
    NotificationModule,
    ReportsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
