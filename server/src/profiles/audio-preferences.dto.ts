import { IsBoolean, IsInt, Max, Min } from "class-validator";

export class AudioPreferencesDto {
  @IsInt()
  @Min(0)
  @Max(100)
  music!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  effects!: number;

  @IsBoolean()
  muted!: boolean;
}
