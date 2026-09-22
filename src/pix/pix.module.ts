import { Module } from '@nestjs/common';
import { PixService } from './pix.service';
import { PixController } from './pix.controller';
import { PixKeyController } from './pix-key/pix-key.controller';
import { PixKeyService } from './pix-key/pix-key.service';
import { PixTransactionService } from './pix-transaction/pix-transaction.service';
import { PixTransactionController } from './pix-transaction/pix-transaction.controller';
import { NotificationModule } from '../notification/notification.module';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';

@Module({
  imports: [NotificationModule],
  controllers: [
    PixController,
    PixKeyController,
    PixTransactionController,
    ReportsController,
  ],
  providers: [PixService, PixKeyService, PixTransactionService, ReportsService],
  exports: [PixService, ReportsService],
})
export class PixModule {}
