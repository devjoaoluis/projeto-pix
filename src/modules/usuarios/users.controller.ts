import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { FilterActivityLogsDto } from './dto/filter-activity-logs.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return await this.usersService.create(dto);
  }

  @Get()
  async findAll() {
    return await this.usersService.findAll();
  }

  @Post(':id/login')
  async registerLogin(
    @Param('id') id: string,
    @Body() dto: CreateActivityLogDto = {},
  ) {
    return await this.usersService.registerLogin(id, dto);
  }

  @Post(':id/activities')
  async registerActivity(
    @Param('id') id: string,
    @Body() dto: CreateActivityLogDto,
  ) {
    return await this.usersService.registerActivity(id, dto);
  }

  @Get(':id/activities')
  async getActivityHistory(
    @Param('id') id: string,
    @Query() filterDto: FilterActivityLogsDto,
  ) {
    return await this.usersService.getActivityHistory(id, filterDto);
  }

  @Get(':id/login-history')
  async getLoginHistory(
    @Param('id') id: string,
    @Query() filterDto: FilterActivityLogsDto,
  ) {
    return await this.usersService.getLoginHistory(id, filterDto);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.usersService.findById(id);
  }
}
