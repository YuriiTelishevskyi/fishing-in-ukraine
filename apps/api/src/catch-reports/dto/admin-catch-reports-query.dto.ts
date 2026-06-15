import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CatchReportStatus } from '@fishing/shared';

export class AdminCatchReportsQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: CatchReportStatus;

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
