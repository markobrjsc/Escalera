import { IsString, Length, Matches } from "class-validator";

export class UsernameDto {
  @IsString()
  @Length(3, 24)
  @Matches(/^[\p{L}\p{N}_-]+$/u, { message: "Der Benutzername enthält nicht erlaubte Zeichen." })
  username!: string;
}
