import { Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
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

  @Delete("avatar")
  async deleteAvatar(@Req() request: AuthenticatedRequest) {
    const user = await this.profiles.deleteAvatar(request.user.id);
    return { user: { id: user.id, username: user.username, avatarKey: user.avatarKey, tutorialCompleted: user.tutorialCompleted } };
  }

  @Post("tutorial/complete")
  async completeTutorial(@Req() request: AuthenticatedRequest) {
    const user = await this.profiles.completeTutorial(request.user.id);
    return { user: { id: user.id, username: user.username, avatarKey: user.avatarKey, tutorialCompleted: user.tutorialCompleted } };
  }

  @Get("avatar/:userId")
  async getAvatar(@Param("userId") userId: string, @Query("size", new ParseIntPipe({ optional: true })) size = 128) {
    return new StreamableFile(await this.profiles.getAvatar(userId, size), {
      type: "image/webp",
      disposition: "inline",
      length: undefined
    });
  }
}
