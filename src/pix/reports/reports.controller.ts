import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';

@Controller('pix/reports')
export class ReportsController {
  constructor(private readonly pixReportService: ReportsService) {}

  @Get('user/:userId')
  async getTransactionsByUser(@Param('userId') userId: string) {
    return this.pixReportService.getTransactionsByUser(userId);
  }

  @Get('user/:userId/period')
  async getTransactionsByPeriod(
    @Param('userId') userId: string,
    @Query() dto: ReportFilterDto,
  ) {
    return this.pixReportService.getTransactionsByPeriod(
      userId,
      dto.startDate,
      dto.endDate,
    );
  }
}
