import { IsIn } from 'class-validator';
import { CatchReportStatus } from '@prisma/client';

export class ModerateCatchReportDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: CatchReportStatus;
}
