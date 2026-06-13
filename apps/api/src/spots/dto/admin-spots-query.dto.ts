import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { SpotStatus } from '@fishing/shared';

export class AdminSpotsQueryDto {
  // Optional with no default: omitted → all statuses (the "Всі" filter).
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: SpotStatus;

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
