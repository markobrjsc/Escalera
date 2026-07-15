import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsInt, IsObject, IsString, IsUUID, Min, ValidateNested } from "class-validator";

class CommandMetadataDto {
  @IsUUID()
  commandId!: string;

  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

class DrawPayloadDto {
  @IsIn(["draw", "discard"])
  source!: "draw" | "discard";
}

export class DrawCardDto extends CommandMetadataDto {
  @ValidateNested()
  @Type(() => DrawPayloadDto)
  payload!: DrawPayloadDto;
}

class LayPhasePayloadDto {
  @IsArray()
  @ArrayMinSize(1)
  combinations!: string[][];
}

export class LayPhaseDto extends CommandMetadataDto {
  @ValidateNested()
  @Type(() => LayPhasePayloadDto)
  payload!: LayPhasePayloadDto;
}

class CardIdsPayloadDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  cardIds!: string[];
}

export class CardIdsDto extends CommandMetadataDto {
  @ValidateNested()
  @Type(() => CardIdsPayloadDto)
  payload!: CardIdsPayloadDto;
}

class CardIdPayloadDto {
  @IsString()
  cardId!: string;
}

export class CardIdDto extends CommandMetadataDto {
  @ValidateNested()
  @Type(() => CardIdPayloadDto)
  payload!: CardIdPayloadDto;
}

export class EmptyGameCommandDto extends CommandMetadataDto {
  @IsObject()
  payload!: Record<string, never>;
}
