import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ReviewStatus } from '@prisma/client';

export class AdminReviewsQueryDto {
  // Optional with no default: omitted → all statuses (the "Всі" filter).
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: ReviewStatus;

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
