import {
  Controller,
  Post,
  Get,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { Public, Roles } from '../../auth/decorators/auth.decorators';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { FilterActivityLogsDto } from './dto/filter-activity-logs.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  async create(@Body() dto: CreateUserDto) {
    return await this.usersService.create(dto);
  }

  @Roles('ADMIN')
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

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return await this.usersService.update(id, dto);
  }

  @Put(':id')
  async replace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return await this.usersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usersService.remove(id);
  }
}
