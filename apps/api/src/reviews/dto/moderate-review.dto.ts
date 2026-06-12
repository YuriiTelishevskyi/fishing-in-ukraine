import { IsIn } from 'class-validator';
import { ReviewStatus } from '@prisma/client';

export class ModerateReviewDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: ReviewStatus;
}
