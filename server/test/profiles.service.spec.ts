import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { ProfilesService } from "../src/profiles/profiles.service.js";

describe("Profilbilder", () => {
  it("erzeugt beide Größen und entfernt beim Ersetzen sowie Löschen alle alten Objekte", async () => {
    let avatarKey: string | null = "avatars/user/old";
    const prisma = { user: {
      findUniqueOrThrow: vi.fn(async () => ({ avatarKey })),
      findUnique: vi.fn(async () => ({ avatarKey })),
      update: vi.fn(async ({ data }: { data: { avatarKey: string | null } }) => {
        avatarKey = data.avatarKey;
        return { id: "user", username: "Marko", avatarKey, tutorialCompleted: false };
      })
    } };
    const stored = new Map<string, Buffer>();
    const storage = {
      putProfileImage: vi.fn(async (key: string, body: Buffer) => { stored.set(key, body); }),
      getProfileImage: vi.fn(async (key: string) => stored.get(key)),
      deleteProfileImages: vi.fn(async (keys: string[]) => keys.forEach((key) => stored.delete(key)))
    };
    const service = new ProfilesService(prisma as never, storage as never);
    const buffer = await sharp({ create: { width: 32, height: 20, channels: 3, background: "#52796f" } }).png().toBuffer();

    const user = await service.uploadAvatar("user", { buffer, mimetype: "image/png" } as Express.Multer.File);
    expect(user.avatarKey).toMatch(/^avatars\/user\//);
    expect(storage.putProfileImage).toHaveBeenCalledTimes(2);
    expect(storage.deleteProfileImages).toHaveBeenCalledWith(["avatars/user/old-128.webp", "avatars/user/old-512.webp"]);
    expect((await service.getAvatar("user", 90)).length).toBeGreaterThan(0);

    const currentKey = avatarKey!;
    await service.deleteAvatar("user");
    expect(avatarKey).toBeNull();
    expect(storage.deleteProfileImages).toHaveBeenLastCalledWith([`${currentKey}-128.webp`, `${currentKey}-512.webp`]);
  });
});
