import { PartialType } from '@nestjs/mapped-types';
import { WATER_STATUSES, WaterStatus } from '@fishing/shared';
import { IsIn, IsOptional } from 'class-validator';
import { CreateWaterDto } from './create-water.dto';

export class UpdateWaterDto extends PartialType(CreateWaterDto) {
  @IsOptional()
  @IsIn(WATER_STATUSES)
  status?: WaterStatus;
}
