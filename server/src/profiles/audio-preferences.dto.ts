import { IsBoolean, IsInt, Max, Min } from "class-validator";

export class AudioPreferencesDto {
  @IsInt()
  @Min(0)
  @Max(100)
  master!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  music!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  ui!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  game!: number;

  @IsBoolean()
  muted!: boolean;
}
