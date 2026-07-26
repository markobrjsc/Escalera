import { BadRequestException } from "@nestjs/common";

export const TUTORIAL_CHAPTER_COUNT = 16;
export const TUTORIAL_LAST_CHAPTER = TUTORIAL_CHAPTER_COUNT - 1;
export const ALL_TUTORIAL_CHAPTERS_MASK = (2 ** TUTORIAL_CHAPTER_COUNT) - 1;

export function withReadChapter(currentMask: number, readChapter: number | undefined) {
  return readChapter === undefined ? currentMask : currentMask | (2 ** readChapter);
}

export function assertTutorialComplete(readMask: number) {
  if ((readMask & ALL_TUTORIAL_CHAPTERS_MASK) !== ALL_TUTORIAL_CHAPTERS_MASK) {
    throw new BadRequestException("Bitte lies alle Tutorial-Kapitel, bevor du die Anleitung abschließt.");
  }
}
