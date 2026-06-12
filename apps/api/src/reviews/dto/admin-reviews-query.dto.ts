import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ReviewStatus } from '@prisma/client';

export class AdminReviewsQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status: ReviewStatus = 'PENDING';

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
