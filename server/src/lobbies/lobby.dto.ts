import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateLobbyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(6)
  maxPlayers = 6;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  jokersPerPlayer = 1;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(300)
  maxTurnSeconds?: number;

  @IsOptional()
  @IsBoolean()
  streetsRequireSameSuit = false;

}
