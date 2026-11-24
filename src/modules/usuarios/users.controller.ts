import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
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
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateActivityLogDto = {},
  ) {
    return await this.usersService.registerLogin(id, dto);
  }

  @Post(':id/activities')
  async registerActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateActivityLogDto,
  ) {
    return await this.usersService.registerActivity(id, dto);
  }

  @Get(':id/activities')
  async getActivityHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filterDto: FilterActivityLogsDto,
  ) {
    return await this.usersService.getActivityHistory(id, filterDto);
  }

  @Get(':id/login-history')
  async getLoginHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filterDto: FilterActivityLogsDto,
  ) {
    return await this.usersService.getLoginHistory(id, filterDto);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usersService.findById(id);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usersService.remove(id);
  }
}
