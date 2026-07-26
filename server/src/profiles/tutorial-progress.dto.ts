import { IsInt, IsOptional, Max, Min } from "class-validator";
import { TUTORIAL_LAST_CHAPTER } from "./tutorial-progress.js";

export class TutorialProgressDto {
  @IsInt()
  @Min(0)
  @Max(TUTORIAL_LAST_CHAPTER)
  step!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(TUTORIAL_LAST_CHAPTER)
  readChapter?: number;
}
