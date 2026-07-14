import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthService } from "./auth.service.js";
import { AccessDto } from "./access.dto.js";
import { AuthenticatedRequest, SessionGuard } from "./session.guard.js";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "./auth.types.js";
import { Req } from "@nestjs/common";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("access")
  async access(@Body() input: AccessDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.access(input);
    response.cookie(SESSION_COOKIE, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_MS,
      path: "/"
    });
    return { created: result.created, user: result.user };
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.[SESSION_COOKIE]);
    response.clearCookie(SESSION_COOKIE, { path: "/" });
  }

  @Get("me")
  @UseGuards(SessionGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }
}
