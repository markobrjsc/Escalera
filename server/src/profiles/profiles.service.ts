import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PrismaService } from "../prisma.service.js";
import { ObjectStorageService } from "./object-storage.service.js";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp"]);

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService, private readonly storage: ObjectStorageService) {}

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file || !ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Erlaubt sind JPEG, PNG und WebP.");
    }
    let image: Buffer;
    try {
      const source = sharp(file.buffer);
      const metadata = await source.metadata();
      if (!metadata.format || !ALLOWED_IMAGE_FORMATS.has(metadata.format)) {
        throw new BadRequestException("Die Datei enthält kein erlaubtes Bildformat.");
      }
      image = await source
        .rotate()
        .resize(512, 512, { fit: "cover", withoutEnlargement: true })
        .webp({ quality: 86 })
        .toBuffer();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException("Die Datei enthält kein lesbares Bild.");
    }
    const key = `avatars/${userId}/${randomUUID()}.webp`;
    await this.storage.putProfileImage(key, image);
    return this.prisma.user.update({ where: { id: userId }, data: { avatarKey: key } });
  }
}
