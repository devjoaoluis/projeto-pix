import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/auth.decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountAccessGuard } from '../auth/guards/account-access.guard';
import { BankAccountService } from './bank-account.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BlockForFraudDto } from './dto/block-for-fraud.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { UpdateDailyLimitDto } from './dto/update-daily-limit.dto';
import { GrantAccountPermissionDto } from './dto/grant-account-permission.dto';

@Controller('bank-accounts')
@UseGuards(JwtAuthGuard, AccountAccessGuard)
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Post()
  create(@Body() dto: CreateBankAccountDto) {
    return this.bankAccountService.create(dto);
  }

  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.bankAccountService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.bankAccountService.findById(id);
  }

  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.bankAccountService.findByUserId(userId);
  }

  @Get(':id/balance')
  getBalance(@Param('id') id: string) {
    return this.bankAccountService.getBalance(id);
  }

  @Get(':id/permissions')
  getPermissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.bankAccountService.getPermissions(id);
  }

  @Post(':id/permissions')
  grantPermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GrantAccountPermissionDto,
  ) {
    return this.bankAccountService.grantPermission(id, dto);
  }

  @Delete(':id/permissions/:memberUserId')
  revokePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberUserId', ParseUUIDPipe) memberUserId: string,
  ) {
    return this.bankAccountService.revokePermission(id, memberUserId);
  }

  @Patch(':id/block')
  block(@Param('id') id: string) {
    return this.bankAccountService.block(id);
  }

  @Patch(':id/block-fraud')
  blockForFraud(@Param('id') id: string, @Body() dto: BlockForFraudDto) {
    return this.bankAccountService.blockForFraud(id, dto);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.bankAccountService.activate(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    return this.bankAccountService.update(id, dto);
  }

  @Roles('ADMIN')
  @Patch(':id/balance')
  updateBalance(@Param('id') id: string, @Body() dto: UpdateBalanceDto) {
    return this.bankAccountService.updateBalance(id, dto.amount);
  }

  @Patch(':id/daily-limit')
  updateDailyLimit(@Param('id') id: string, @Body() dto: UpdateDailyLimitDto) {
    return this.bankAccountService.updateDailyLimit(id, dto.dailyLimit);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bankAccountService.remove(id);
  }
}
