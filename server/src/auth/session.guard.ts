import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service.js";
import { SESSION_COOKIE } from "./auth.types.js";

export interface AuthenticatedRequest extends Request {
  user: { id: string; username: string; avatarKey: string | null; tutorialCompleted: boolean };
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[SESSION_COOKIE];
    if (typeof token !== "string") throw new UnauthorizedException("Anmeldung erforderlich.");

    const user = await this.auth.getSessionUser(token);
    if (!user) throw new UnauthorizedException("Sitzung ist abgelaufen.");
    request.user = user;
    return true;
  }
}
