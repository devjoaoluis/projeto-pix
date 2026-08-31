import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/usuarios/users.module';
import { PixModule } from './pix/pix.module';
import { DbModule } from './db/db.module';
import { BankAccountModule } from './bank-account/bank-account.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    BankAccountModule,
    PixModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
