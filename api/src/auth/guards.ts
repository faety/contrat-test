import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { JwtPayload } from "./auth.service";

export interface AuthenticatedRequest extends Request {
  auth: JwtPayload;
}

/** Contrôle d'autorisation sur chaque endpoint protégé (règle 13). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Jeton manquant.");
    }
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(header.slice(7));
      if (payload.type !== "access") throw new Error("wrong token type");
      request.auth = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Jeton invalide ou expiré.");
    }
  }
}

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth || !required.includes(request.auth.role)) {
      throw new ForbiddenException("Droits insuffisants.");
    }
    return true;
  }
}

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);
