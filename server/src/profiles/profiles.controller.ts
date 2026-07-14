import { Controller, Get, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthenticatedRequest, SessionGuard } from "../auth/session.guard.js";
import { ProfilesService } from "./profiles.service.js";

@Controller("profile")
@UseGuards(SessionGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get()
  getProfile(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }

  @Post("avatar")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(@Req() request: AuthenticatedRequest, @UploadedFile() file: Express.Multer.File) {
    const user = await this.profiles.uploadAvatar(request.user.id, file);
    return { user: { id: user.id, username: user.username, avatarKey: user.avatarKey, tutorialCompleted: user.tutorialCompleted } };
  }
}
