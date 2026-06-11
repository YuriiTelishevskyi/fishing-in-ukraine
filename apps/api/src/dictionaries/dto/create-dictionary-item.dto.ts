import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDictionaryItemDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
