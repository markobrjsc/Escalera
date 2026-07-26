import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthenticatedRequest, SessionGuard } from "../auth/session.guard.js";
import { ProfilesService } from "./profiles.service.js";
import { StatisticsService } from "./statistics.service.js";
import { AudioPreferencesDto } from "./audio-preferences.dto.js";
import { TutorialProgressDto } from "./tutorial-progress.dto.js";
import { isAdminUsername } from "../auth/auth.types.js";

type OwnUser = {
  id: string;
  username: string;
  avatarKey: string | null;
  tutorialCompleted: boolean;
  tutorialStep: number;
  tutorialReadMask: number;
};

function ownUser(user: OwnUser) {
  return {
    id: user.id,
    username: user.username,
    avatarKey: user.avatarKey,
    tutorialCompleted: user.tutorialCompleted,
    tutorialStep: user.tutorialStep,
    tutorialReadMask: user.tutorialReadMask,
    isAdmin: isAdminUsername(user.username)
  };
}

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
    return { user: ownUser(user) };
  }

  @Delete("avatar")
  async deleteAvatar(@Req() request: AuthenticatedRequest) {
    const user = await this.profiles.deleteAvatar(request.user.id);
    return { user: ownUser(user) };
  }

  @Put("tutorial")
  async updateTutorialProgress(@Req() request: AuthenticatedRequest, @Body() input: TutorialProgressDto) {
    const user = await this.profiles.updateTutorialProgress(request.user.id, input);
    return { user: ownUser(user) };
  }

  @Post("tutorial/complete")
  async completeTutorial(@Req() request: AuthenticatedRequest, @Body() input: TutorialProgressDto) {
    const user = await this.profiles.completeTutorial(request.user.id, input);
    return { user: ownUser(user) };
  }

  @Post("tutorial/reset")
  async resetTutorial(@Req() request: AuthenticatedRequest) {
    const user = await this.profiles.resetTutorial(request.user.id);
    return { user: ownUser(user) };
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
