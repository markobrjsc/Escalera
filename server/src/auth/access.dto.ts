import { IsBoolean, IsOptional, IsString, Length, Matches } from "class-validator";

export class AccessDto {
  @IsString()
  @Length(3, 24)
  @Matches(/^[\p{L}\p{N}_-]+$/u, { message: "Der Benutzername enthält nicht erlaubte Zeichen." })
  username!: string;

  @IsString()
  @Length(12, 128)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(12, 128)
  passwordConfirmation?: string;

  @IsOptional()
  @IsBoolean()
  acceptPasswordLoss?: boolean;
}
