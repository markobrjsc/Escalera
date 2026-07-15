import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma.service.js";
import { AccessDto } from "./access.dto.js";
import { hashSessionToken, newSessionToken, normalizeUsername, SESSION_MAX_AGE_MS } from "./auth.types.js";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async access(input: AccessDto) {
    const username = input.username.trim().normalize("NFKC");
    const usernameNormalized = normalizeUsername(username);
    const existing = await this.prisma.user.findUnique({ where: { usernameNormalized } });

    let user = existing;
    let created = false;
    if (user) {
      if (!(await argon2.verify(user.passwordHash, input.password))) {
        throw new UnauthorizedException("Ungültiger Benutzername oder Passwort.");
      }
    } else {
      if (input.passwordConfirmation !== input.password) {
        throw new BadRequestException("Die Passwörter stimmen nicht überein.");
      }
      if (!input.acceptPasswordLoss) {
        throw new BadRequestException("Bitte bestätige, dass dieses Konto ohne Passwort nicht wiederhergestellt werden kann.");
      }
      try {
        user = await this.prisma.user.create({
          data: {
            username,
            usernameNormalized,
            passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }),
            statistic: { create: {} }
          }
        });
        created = true;
      } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
          throw new ConflictException("Benutzername wurde gerade vergeben. Bitte erneut anmelden.");
        }
        throw error;
      }
    }

    const token = newSessionToken();
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS)
      }
    });
    return { created, token, user: this.publicUser(user) };
  }

  async usernameExists(username: string) {
    return Boolean(await this.prisma.user.findUnique({ where: { usernameNormalized: normalizeUsername(username.trim().normalize("NFKC")) }, select: { id: true } }));
  }

  async logout(token: string | undefined) {
    if (token) await this.prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }

  async getSessionUser(token: string | undefined) {
    if (!token) return null;
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true }
    });
    if (!session || session.expiresAt <= new Date()) return null;
    return this.publicUser(session.user);
  }

  publicUser(user: { id: string; username: string; avatarKey?: string | null; tutorialCompleted?: boolean }) {
    return {
      id: user.id,
      username: user.username,
      avatarKey: user.avatarKey ?? null,
      tutorialCompleted: user.tutorialCompleted ?? false
    };
  }
}
