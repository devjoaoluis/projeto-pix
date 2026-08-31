import { Controller, Post, Get, Patch, Param, Body } from '@nestjs/common';
import { PixService } from './pix.service';
import { CreatePixDto } from './dto/create-pix.dto';

@Controller('pix')
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
  async getStatus(@Param('id') id: string) {
    return this.pixService.getStatus(id);
  }

  @Patch(':id/simulate-payment')
  async simulatePayment(@Param('id') id: string) {
    return this.pixService.simulateWebhookEvent(id);
  }
}
