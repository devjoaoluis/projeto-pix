import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PixModule } from './pix/pix.module';
import { DbModule } from './db/db.module';
import { ContasBancariasModule } from './ContaBancaria/ContaBancaria.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PixModule, DbModule, ContasBancariasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
