import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PixContactService } from './pix-contact.service';
import { CreatePixContactDto } from './dto/create-pix-contact.dto';
import { UpdatePixContactDto } from './dto/update-pix-contact.dto';

@Controller('pix/contacts')
@UseGuards(JwtAuthGuard)
export class PixContactController {
  constructor(private readonly pixContactService: PixContactService) {}

  @Post('user/:userId')
  create(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreatePixContactDto,
  ) {
    return this.pixContactService.create(userId, dto);
  }

  @Get('user/:userId')
  findAllByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.pixContactService.findAllByUser(userId);
  }

  @Post('user/:userId/sync')
  syncContacts(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('identifiers') identifiers: string[],
  ) {
    return this.pixContactService.syncContacts(userId, identifiers);
  }

  @Get('user/:userId/:contactId')
  findById(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.pixContactService.findById(userId, contactId);
  }

  @Patch('user/:userId/:contactId')
  update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdatePixContactDto,
  ) {
    return this.pixContactService.update(userId, contactId, dto);
  }

  @Delete('user/:userId/:contactId')
  remove(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.pixContactService.remove(userId, contactId);
  }
}
