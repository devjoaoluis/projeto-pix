import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AccountAccessGuard } from '../../auth/guards/account-access.guard';
import { PixKeyService } from './pix-key.service';
import { CreatePixKeyDto } from './dto/create-pix-key.dto';
import { UpdatePixKeyDto } from './dto/update-pix-key.dto';
import { SuspendPixKeyDto } from './dto/suspend-pix-key.dto';

@Controller('pix/keys')
@UseGuards(JwtAuthGuard, AccountAccessGuard)
export class PixKeyController {
  constructor(private readonly pixKeyService: PixKeyService) {}

  @Post('account/:bankAccountId')
  create(
    @Param('bankAccountId', ParseUUIDPipe) bankAccountId: string,
    @Body() dto: CreatePixKeyDto,
  ) {
    return this.pixKeyService.create(bankAccountId, dto);
  }

  @Get('account/:bankAccountId')
  findByAccount(@Param('bankAccountId', ParseUUIDPipe) bankAccountId: string) {
    return this.pixKeyService.findByAccount(bankAccountId);
  }

  @Post('account/:bankAccountId/random')
  generateRandomKey(
    @Param('bankAccountId', ParseUUIDPipe) bankAccountId: string,
  ) {
    return this.pixKeyService.generateRandomKey(bankAccountId);
  }

  @Patch('account/:bankAccountId/:id')
  update(
    @Param('bankAccountId', ParseUUIDPipe) bankAccountId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePixKeyDto,
  ) {
    return this.pixKeyService.update(bankAccountId, id, dto);
  }

  @Patch('account/:bankAccountId/:id/random')
  updateRandomKey(
    @Param('bankAccountId', ParseUUIDPipe) bankAccountId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pixKeyService.updateRandomKey(bankAccountId, id);
  }

  @Patch('account/:bankAccountId/:id/suspend')
  suspend(
    @Param('bankAccountId', ParseUUIDPipe) bankAccountId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto?: SuspendPixKeyDto,
  ) {
    return this.pixKeyService.suspend(bankAccountId, id, dto?.reason);
  }

  @Patch('account/:bankAccountId/:id/unblock')
  unblock(
    @Param('bankAccountId', ParseUUIDPipe) bankAccountId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pixKeyService.unblock(bankAccountId, id);
  }

  @Delete('account/:bankAccountId/:id')
  remove(
    @Param('bankAccountId', ParseUUIDPipe) bankAccountId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.pixKeyService.remove(bankAccountId, id);
  }

  @Patch(':id/suspend')
  suspendById(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto?: SuspendPixKeyDto,
  ) {
    return this.pixKeyService.suspendWithoutAccount(id, dto?.reason);
  }

  @Patch(':id/unblock')
  unblockById(@Param('id', ParseUUIDPipe) id: string) {
    return this.pixKeyService.unblockWithoutAccount(id);
  }

  @Patch(':id')
  updateById(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePixKeyDto,
  ) {
    return this.pixKeyService.updateWithoutAccount(id, dto);
  }
}
