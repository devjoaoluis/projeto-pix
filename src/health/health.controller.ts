import { Controller, Get } from '@nestjs/common';
import { HealthCheckResponse, HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): Promise<HealthCheckResponse> {
    return this.healthService.check();
  }
}
