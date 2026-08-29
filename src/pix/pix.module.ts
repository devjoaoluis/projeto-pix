import { Module } from '@nestjs/common';
import { PixService } from './pix.service';
import { PixController } from './pix.controller';

@Module({
  controllers: [PixController],
  providers: [PixService],
})
export class PixModule {}
