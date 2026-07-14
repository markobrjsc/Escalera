import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../prisma.service.js";
import { hashSessionToken, SESSION_COOKIE } from "./auth.types.js";

export interface AuthenticatedRequest extends Request {
  user: { id: string; username: string; avatarKey: string | null; tutorialCompleted: boolean };
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[SESSION_COOKIE];
    if (typeof token !== "string") throw new UnauthorizedException("Anmeldung erforderlich.");

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true }
    });
    if (!session || session.expiresAt <= new Date()) throw new UnauthorizedException("Sitzung ist abgelaufen.");

    request.user = {
      id: session.user.id,
      username: session.user.username,
      avatarKey: session.user.avatarKey,
      tutorialCompleted: session.user.tutorialCompleted
    };
    return true;
  }
}
