import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PixModule } from './pix/pix.module';
import { DbModule } from './db/db.module';

@Module({
  imports: [PixModule, DbModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
