import { Module } from '@nestjs/common';
import { PixService } from './pix.service';
import { PixController } from './pix.controller';
import { PixKeyController } from './pix-key/pix-key.controller';
import { PixKeyService } from './pix-key/pix-key.service';

@Module({
  controllers: [PixController, PixKeyController],
  providers: [PixService, PixKeyService],
})
export class PixModule { }
