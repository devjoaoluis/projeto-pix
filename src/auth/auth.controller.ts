import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser, Public } from './decorators/auth.decorators';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { JwtUserPayload } from './jwt-token.service';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto, @Ip() ipAddress?: string) {
    return this.authService.login(dto, ipAddress);
  }

  @Get('me')
  me(@CurrentUser() user?: JwtUserPayload) {
    if (!user?.sub) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    return this.authService.getProfile(user.sub);
  }
}
