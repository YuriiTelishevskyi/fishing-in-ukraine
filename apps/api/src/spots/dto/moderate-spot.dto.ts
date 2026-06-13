import { IsIn } from 'class-validator';
import { SpotStatus } from '@fishing/shared';

export class ModerateSpotDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: SpotStatus;
}
