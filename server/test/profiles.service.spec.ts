import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { ProfilesService } from "../src/profiles/profiles.service.js";
import { ALL_TUTORIAL_CHAPTERS_MASK } from "../src/profiles/tutorial-progress.js";

describe("Profilbilder", () => {
  it("erzeugt beide Größen und entfernt beim Ersetzen sowie Löschen alle alten Objekte", async () => {
    let avatarKey: string | null = "avatars/user/old";
    const prisma = { user: {
      findUniqueOrThrow: vi.fn(async () => ({ avatarKey })),
      findUnique: vi.fn(async () => ({ avatarKey })),
      update: vi.fn(async ({ data }: { data: { avatarKey: string | null } }) => {
        avatarKey = data.avatarKey;
        return { id: "user", username: "Marko", avatarKey, tutorialCompleted: false, tutorialStep: 0, tutorialReadMask: 0 };
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

  it("liefert sichere Audio-Defaults und speichert alle privaten Pegel", async () => {
    const prisma = {
      userAudioPreference: {
        findUnique: vi.fn(async () => null),
        upsert: vi.fn(async ({ create }: { create: object }) => create)
      }
    };
    const service = new ProfilesService(prisma as never, {} as never);

    await expect(service.getAudioPreferences("user")).resolves.toEqual({ music: 60, effects: 72, muted: false });
    await expect(service.updateAudioPreferences("user", { music: 58, effects: 81, muted: true })).resolves.toMatchObject({ music: 58, effects: 81, muted: true });
    expect(prisma.userAudioPreference.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user" }, update: { music: 58, effects: 81, muted: true } }));
  });
});

describe("serverpersistierter Tutorial-Fortschritt", () => {
  function setup(tutorialReadMask = 0) {
    let user = {
      id: "user",
      username: "Marko",
      avatarKey: null,
      tutorialCompleted: false,
      tutorialStep: 0,
      tutorialReadMask
    };
    const prisma = {
      user: {
        findUniqueOrThrow: vi.fn(async () => ({ tutorialReadMask: user.tutorialReadMask })),
        update: vi.fn(async ({ data }: { data: Partial<typeof user> }) => {
          user = { ...user, ...data };
          return user;
        })
      }
    };
    return { service: new ProfilesService(prisma as never, {} as never), prisma, user: () => user };
  }

  it("speichert Schritt und gelesene Kapitel additiv", async () => {
    const { service, prisma, user } = setup(1);
    await expect(service.updateTutorialProgress("user", { step: 5, readChapter: 5 })).resolves.toMatchObject({
      tutorialStep: 5,
      tutorialReadMask: 33
    });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "user" },
      data: { tutorialStep: 5, tutorialReadMask: 33 }
    }));
    expect(user().tutorialCompleted).toBe(false);
  });

  it("verweigert einen unvollständigen Abschluss serverseitig", async () => {
    const { service, prisma } = setup(3);
    await expect(service.completeTutorial("user", { step: 2, readChapter: 2 })).rejects.toThrow("alle Tutorial-Kapitel");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("schließt erst mit vollständiger Lesemaske ab", async () => {
    const lastBit = 2 ** 15;
    const { service } = setup(ALL_TUTORIAL_CHAPTERS_MASK - lastBit);
    await expect(service.completeTutorial("user", { step: 15, readChapter: 15 })).resolves.toMatchObject({
      tutorialCompleted: true,
      tutorialStep: 15,
      tutorialReadMask: ALL_TUTORIAL_CHAPTERS_MASK
    });
  });

  it("setzt Abschluss, Schritt und Lesemaske vollständig zurück", async () => {
    const { service } = setup(ALL_TUTORIAL_CHAPTERS_MASK);
    await service.completeTutorial("user", { step: 15, readChapter: 15 });
    await expect(service.resetTutorial("user")).resolves.toMatchObject({
      tutorialCompleted: false,
      tutorialStep: 0,
      tutorialReadMask: 0
    });
  });
});
