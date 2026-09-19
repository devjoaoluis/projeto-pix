import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PixModule } from './pix/pix.module';
import { DbModule } from './db/db.module';
import { BankAccountModule } from './bank-account/bank-account.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PixModule, DbModule, BankAccountModule, NotificationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
