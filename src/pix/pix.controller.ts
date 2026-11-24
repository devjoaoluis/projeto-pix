import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  ForbiddenException,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountAccessGuard } from '../auth/guards/account-access.guard';
import { PixService } from './pix.service';
import { CreatePixDto } from './dto/create-pix.dto';

@Controller('pix')
@UseGuards(JwtAuthGuard, AccountAccessGuard)
export class PixController {
  constructor(private readonly pixService: PixService) {}

  @Post('generate')
  async generatePix(@Body() dto: CreatePixDto) {
    return this.pixService.generatePix(
      dto.bankAccountId,
      dto.amount,
      dto.description,
    );
  }

  @Get(':id/status')
  async getStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.pixService.getStatus(id);
  }

  @Patch(':id/simulate-payment')
  async simulatePayment(@Param('id', ParseUUIDPipe) id: string) {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_PAYMENT_SIMULATION !== 'true'
    ) {
      throw new ForbiddenException(
        'Simulação de pagamento permitida apenas em ambiente de desenvolvimento/teste',
      );
    }
    return this.pixService.simulateWebhookEvent(id);
  }
}
