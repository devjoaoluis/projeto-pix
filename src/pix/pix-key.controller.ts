import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

import { PixKeyService } from './pix-key.service';
import { CreatePixKeyDto } from './dto/create-pix-key.dto';

@Controller('accounts/:accountId/pix/keys')
export class PixKeyController {
  constructor(private readonly pixKeyService: PixKeyService) {}

  @Post()
  create(@Param('accountId') accountId: string, @Body() dto: CreatePixKeyDto) {
    return this.pixKeyService.create(accountId, dto);
  }

  @Get()
  findByAccount(@Param('accountId') accountId: string) {
    return this.pixKeyService.findByAccount(accountId);
  }

  @Post('random')
  generateRandomKey(@Param('accountId') accountId: string) {
    return this.pixKeyService.generateRandomKey(accountId);
  }

  @Delete(':id')
  remove(@Param('accountId') accountId: string, @Param('id') id: string) {
    return this.pixKeyService.remove(accountId, id);
  }
}
