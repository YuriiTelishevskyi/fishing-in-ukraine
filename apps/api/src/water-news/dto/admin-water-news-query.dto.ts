import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminWaterNewsQueryDto {
  @IsOptional()
  @IsString()
  waterId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  perPage: number = 20;
}
