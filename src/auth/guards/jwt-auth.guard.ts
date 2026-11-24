import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../decorators/auth.decorators';
import { JwtTokenService, JwtUserPayload } from '../jwt-token.service';

type AuthenticatedRequest = Request & { user?: JwtUserPayload };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Optional()
    private readonly jwtTokenService: JwtTokenService = new JwtTokenService(),
    @Optional()
    private readonly reflector: Reflector = new Reflector(),
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = req.headers?.authorization;

    if (typeof authHeader === 'string' && authHeader.trim().length > 0) {
      const [scheme, token] = authHeader.trim().split(/\s+/);
      if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
        throw new UnauthorizedException(
          'Formato do cabeçalho Authorization inválido. Use: Bearer <token>',
        );
      }

      const payload = this.jwtTokenService.verify(token);
      req.user = payload;
      this.enforceAuthorization(req, payload, requiredRoles);
      return true;
    }

    if (process.env.AUTH_REQUIRED === 'false') {
      return true;
    }

    throw new UnauthorizedException('Token de autenticação não informado');
  }

  private enforceAuthorization(
    req: AuthenticatedRequest,
    user: JwtUserPayload,
    requiredRoles?: string[],
  ): void {
    if (
      requiredRoles &&
      requiredRoles.length > 0 &&
      !requiredRoles.includes(user.role)
    ) {
      throw new ForbiddenException(
        'Permissão insuficiente para acessar este recurso',
      );
    }

    if (user.role === 'ADMIN') {
      return;
    }

    const paramUserId = req.params?.userId;
    if (typeof paramUserId === 'string' && paramUserId !== user.sub) {
      throw new ForbiddenException(
        'Acesso negado a recursos de outro usuário',
      );
    }

    const routePath = `${req.baseUrl ?? ''}${req.path ?? ''}`;
    if (
      (routePath.startsWith('/users') ||
        routePath.startsWith('/api/v1/users')) &&
      typeof req.params?.id === 'string' &&
      req.params.id !== user.sub
    ) {
      throw new ForbiddenException(
        'Acesso negado ao perfil de outro usuário',
      );
    }
  }
}
