import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthenticatedRequest, SessionGuard } from "../auth/session.guard.js";
import { ProfilesService } from "./profiles.service.js";
import { StatisticsService } from "./statistics.service.js";
import { AudioPreferencesDto } from "./audio-preferences.dto.js";

@Controller("profile")
@UseGuards(SessionGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService, private readonly statistics: StatisticsService) {}

  @Get()
  getProfile(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }

  @Get("statistics")
  getStatistics(@Req() request: AuthenticatedRequest) {
    return this.statistics.profile(request.user.id);
  }

  @Get("audio")
  getAudioPreferences(@Req() request: AuthenticatedRequest) {
    return this.profiles.getAudioPreferences(request.user.id);
  }

  @Put("audio")
  updateAudioPreferences(@Req() request: AuthenticatedRequest, @Body() input: AudioPreferencesDto) {
    return this.profiles.updateAudioPreferences(request.user.id, input);
  }

  @Get("users/:userId")
  async getPublicProfile(@Param("userId") userId: string) {
    const [user, profile] = await Promise.all([this.profiles.getPublicUser(userId), this.statistics.profile(userId)]);
    return { user, ...profile };
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
