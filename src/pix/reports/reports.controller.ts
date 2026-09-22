import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';

@Controller('pix/reports')
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
  async getReport(@Param('reportId') reportId: string) {
    return this.reportsService.getReport(reportId);
  }
}
