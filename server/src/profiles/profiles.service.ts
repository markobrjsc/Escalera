import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PrismaService } from "../prisma.service.js";
import { ObjectStorageService } from "./object-storage.service.js";
import type { AudioPreferencesDto } from "./audio-preferences.dto.js";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp"]);
export const DEFAULT_AUDIO_PREFERENCES = { master: 72, music: 34, ui: 64, game: 76, muted: false } as const;

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService, private readonly storage: ObjectStorageService) {}

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file || !ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Erlaubt sind JPEG, PNG und WebP.");
    }
    let images: Array<{ size: number; body: Buffer }>;
    try {
      const source = sharp(file.buffer);
      const metadata = await source.metadata();
      if (!metadata.format || !ALLOWED_IMAGE_FORMATS.has(metadata.format)) {
        throw new BadRequestException("Die Datei enthält kein erlaubtes Bildformat.");
      }
      images = await Promise.all([128, 512].map(async (size) => ({
        size,
        body: await source.clone().rotate().resize(size, size, { fit: "cover" }).webp({ quality: size === 128 ? 82 : 86 }).toBuffer()
      })));
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException("Die Datei enthält kein lesbares Bild.");
    }
    const avatarKey = `avatars/${userId}/${randomUUID()}`;
    const keys = images.map(({ size }) => this.variantKey(avatarKey, size));
    const previous = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { avatarKey: true } });
    let updated = false;
    try {
      await Promise.all(images.map(({ size, body }) => this.storage.putProfileImage(this.variantKey(avatarKey, size), body)));
      const user = await this.prisma.user.update({ where: { id: userId }, data: { avatarKey } });
      updated = true;
      if (previous.avatarKey) await this.storage.deleteProfileImages(this.variantKeys(previous.avatarKey));
      return user;
    } catch (error) {
      if (updated) await this.prisma.user.update({ where: { id: userId }, data: { avatarKey: previous.avatarKey } }).catch(() => undefined);
      await this.storage.deleteProfileImages(keys).catch(() => undefined);
      throw error;
    }
  }

  async deleteAvatar(userId: string) {
    const previous = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { avatarKey: true } });
    const user = await this.prisma.user.update({ where: { id: userId }, data: { avatarKey: null } });
    try {
      if (previous.avatarKey) await this.storage.deleteProfileImages(this.variantKeys(previous.avatarKey));
    } catch (error) {
      await this.prisma.user.update({ where: { id: userId }, data: { avatarKey: previous.avatarKey } });
      throw error;
    }
    return user;
  }

  completeTutorial(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { tutorialCompleted: true } });
  }

  async getAudioPreferences(userId: string) {
    return await this.prisma.userAudioPreference.findUnique({
      where: { userId },
      select: { master: true, music: true, ui: true, game: true, muted: true }
    }) ?? DEFAULT_AUDIO_PREFERENCES;
  }

  updateAudioPreferences(userId: string, input: AudioPreferencesDto) {
    const data = { master: input.master, music: input.music, ui: input.ui, game: input.game, muted: input.muted };
    return this.prisma.userAudioPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      select: { master: true, music: true, ui: true, game: true, muted: true }
    });
  }

  async getPublicUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, avatarKey: true } });
    if (!user) throw new NotFoundException("Spielerprofil nicht gefunden.");
    return user;
  }

  async getAvatar(userId: string, requestedSize: number) {
    const size = requestedSize <= 128 ? 128 : 512;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarKey: true } });
    if (!user?.avatarKey) throw new NotFoundException("Dieser Spieler hat kein Profilbild.");
    const image = await this.storage.getProfileImage(this.variantKey(user.avatarKey, size));
    if (!image) throw new NotFoundException("Profilbild nicht gefunden.");
    return Buffer.from(image);
  }

  private variantKeys(avatarKey: string) {
    return [128, 512].map((size) => this.variantKey(avatarKey, size));
  }

  private variantKey(avatarKey: string, size: number) {
    return `${avatarKey}-${size}.webp`;
  }
}
