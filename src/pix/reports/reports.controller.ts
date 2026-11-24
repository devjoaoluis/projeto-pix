import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/auth.decorators';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { JwtUserPayload } from '../../auth/jwt-token.service';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';

@Controller('pix/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('user/:userId')
  async createUserReport(@Param('userId') userId: string) {
    return this.reportsService.createUserReport(userId);
  }

  @Post('user/:userId/period')
  async createPeriodReport(
    @Param('userId') userId: string,
    @Body() dto: ReportFilterDto,
  ) {
    return this.reportsService.createPeriodReport(
      userId,
      dto.startDate,
      dto.endDate,
    );
  }

  @Get('user/:userId')
  async getReportsByUser(@Param('userId') userId: string) {
    return this.reportsService.getReportsByUser(userId);
  }

  @Get(':reportId')
  async getReport(
    @Param('reportId') reportId: string,
    @CurrentUser() user?: JwtUserPayload,
  ) {
    const report = await this.reportsService.getReport(reportId);
    if (user && user.role !== 'ADMIN' && report.userId !== user.sub) {
      throw new ForbiddenException(
        'Acesso negado ao relatório de outro usuário',
      );
    }
    return report;
  }
}
