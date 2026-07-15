import { ArrayMinSize, IsArray, IsIn, IsString } from "class-validator";

export class DrawCardDto {
  @IsIn(["draw", "discard"])
  source!: "draw" | "discard";
}

export class LayPhaseDto {
  @IsArray()
  @ArrayMinSize(1)
  combinations!: string[][];
}

export class CardIdsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  cardIds!: string[];
}

export class CardIdDto {
  @IsString()
  cardId!: string;
}
