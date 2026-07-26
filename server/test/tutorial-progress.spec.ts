import { readFileSync } from "node:fs";
import { validate } from "class-validator";
import { describe, expect, it, vi } from "vitest";
import { ProfilesController } from "../src/profiles/profiles.controller.js";
import { TutorialProgressDto } from "../src/profiles/tutorial-progress.dto.js";

function dto(step: number, readChapter?: number) {
  return Object.assign(new TutorialProgressDto(), { step, readChapter });
}

describe("Tutorial-API", () => {
  it("migriert Schritt und Lesemaske mit sicheren Defaults und Datenbankgrenzen", () => {
    const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
    const migration = readFileSync(new URL("../prisma/migrations/20260726010000_tutorial_progress/migration.sql", import.meta.url), "utf8");
    expect(schema).toMatch(/tutorialStep\s+Int\s+@default\(0\)/);
    expect(schema).toMatch(/tutorialReadMask\s+Int\s+@default\(0\)/);
    expect(migration).toContain('CHECK ("tutorialStep" BETWEEN 0 AND 15)');
    expect(migration).toContain('CHECK ("tutorialReadMask" BETWEEN 0 AND 65535)');
  });

  it("akzeptiert ausschließlich tatsächliche Kapitelindizes", async () => {
    await expect(validate(dto(0, 15))).resolves.toHaveLength(0);
    expect(await validate(dto(-1, 0))).not.toHaveLength(0);
    expect(await validate(dto(16, 0))).not.toHaveLength(0);
    expect(await validate(dto(0, 16))).not.toHaveLength(0);
    expect(await validate(dto(1.5, 1))).not.toHaveLength(0);
  });

  it("liefert nach Fortschritt und Reset alle privaten Tutorial-Felder ohne sensible Kontodaten", async () => {
    const progressed = {
      id: "user",
      username: "Marko",
      avatarKey: null,
      tutorialCompleted: false,
      tutorialStep: 6,
      tutorialReadMask: 65,
      passwordHash: "darf-nicht-in-die-antwort"
    };
    const reset = { ...progressed, tutorialStep: 0, tutorialReadMask: 0 };
    const profiles = {
      updateTutorialProgress: vi.fn(async () => progressed),
      resetTutorial: vi.fn(async () => reset)
    };
    const controller = new ProfilesController(profiles as never, {} as never);
    const request = { user: { id: "user" } } as never;

    const progressResponse = await controller.updateTutorialProgress(request, dto(6, 6));
    expect(progressResponse.user).toMatchObject({
      tutorialCompleted: false,
      tutorialStep: 6,
      tutorialReadMask: 65,
      isAdmin: false
    });
    expect(progressResponse.user).not.toHaveProperty("passwordHash");

    const resetResponse = await controller.resetTutorial(request);
    expect(resetResponse.user).toMatchObject({ tutorialStep: 0, tutorialReadMask: 0 });
    expect(profiles.resetTutorial).toHaveBeenCalledWith("user");
  });
});
