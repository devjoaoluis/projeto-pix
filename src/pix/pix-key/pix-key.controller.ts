import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { PixKeyService } from './pix-key.service';
import { CreatePixKeyDto } from './dto/create-pix-key.dto';
import { UpdatePixKeyDto } from './dto/update-pix-key.dto';
import { SuspendPixKeyDto } from './dto/suspend-pix-key.dto';

@Controller(['pix/keys/account', 'pix/keys'])
export class PixKeyController {
  constructor(private readonly pixKeyService: PixKeyService) {}

  @Post(':bankAccountId')
  create(
    @Param('bankAccountId') bankAccountId: string,
    @Body() dto: CreatePixKeyDto,
  ) {
    return this.pixKeyService.create(bankAccountId, dto);
  }

  @Get(':bankAccountId')
  findByAccount(@Param('bankAccountId') bankAccountId: string) {
    return this.pixKeyService.findByAccount(bankAccountId);
  }

  @Post(':bankAccountId/random')
  generateRandomKey(@Param('bankAccountId') bankAccountId: string) {
    return this.pixKeyService.generateRandomKey(bankAccountId);
  }

  @Patch(':bankAccountId/:id')
  update(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePixKeyDto,
  ) {
    return this.pixKeyService.update(bankAccountId, id, dto);
  }

  @Put(':bankAccountId/:id')
  updatePut(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePixKeyDto,
  ) {
    return this.pixKeyService.update(bankAccountId, id, dto);
  }

  @Patch(':bankAccountId/:id/random')
  updateRandomKey(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
  ) {
    return this.pixKeyService.updateRandomKey(bankAccountId, id);
  }

  @Patch(':bankAccountId/:id/unblock')
  unblock(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
  ) {
    return this.pixKeyService.unblock(bankAccountId, id);
  }

  @Put(':bankAccountId/:id/unblock')
  unblockPut(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
  ) {
    return this.pixKeyService.unblock(bankAccountId, id);
  }

  @Patch(':bankAccountId/:id/desbloquear')
  desbloquear(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
  ) {
    return this.pixKeyService.unblock(bankAccountId, id);
  }

  @Patch(':bankAccountId/:id/activate')
  activate(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
  ) {
    return this.pixKeyService.unblock(bankAccountId, id);
  }

  @Patch(':bankAccountId/:id/suspend')
  suspend(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
    @Body() dto?: SuspendPixKeyDto,
  ) {
    return this.pixKeyService.suspend(bankAccountId, id, dto?.reason);
  }

  @Patch(':bankAccountId/:id/block')
  block(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
    @Body() dto?: SuspendPixKeyDto,
  ) {
    return this.pixKeyService.suspend(bankAccountId, id, dto?.reason);
  }

  @Patch(':id/unblock')
  unblockById(@Param('id') id: string) {
    return this.pixKeyService.unblockWithoutAccount(id);
  }

  @Put(':id/unblock')
  unblockByIdPut(@Param('id') id: string) {
    return this.pixKeyService.unblockWithoutAccount(id);
  }

  @Patch(':id/desbloquear')
  desbloquearById(@Param('id') id: string) {
    return this.pixKeyService.unblockWithoutAccount(id);
  }

  @Patch(':id/activate')
  activateById(@Param('id') id: string) {
    return this.pixKeyService.unblockWithoutAccount(id);
  }

  @Patch(':id/suspend')
  suspendById(@Param('id') id: string, @Body() dto?: SuspendPixKeyDto) {
    return this.pixKeyService.suspendWithoutAccount(id, dto?.reason);
  }

  @Patch(':id/block')
  blockById(@Param('id') id: string, @Body() dto?: SuspendPixKeyDto) {
    return this.pixKeyService.suspendWithoutAccount(id, dto?.reason);
  }

  @Patch(':id')
  updateById(@Param('id') id: string, @Body() dto: UpdatePixKeyDto) {
    return this.pixKeyService.updateWithoutAccount(id, dto);
  }

  @Put(':id')
  updateByIdPut(@Param('id') id: string, @Body() dto: UpdatePixKeyDto) {
    return this.pixKeyService.updateWithoutAccount(id, dto);
  }

  @Delete(':bankAccountId/:id')
  remove(
    @Param('bankAccountId') bankAccountId: string,
    @Param('id') id: string,
  ) {
    return this.pixKeyService.remove(bankAccountId, id);
  }
}
