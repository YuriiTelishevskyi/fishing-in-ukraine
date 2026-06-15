import { PartialType } from '@nestjs/mapped-types';
import { CreateWaterNewsDto } from './create-water-news.dto';

export class UpdateWaterNewsDto extends PartialType(CreateWaterNewsDto) {}
