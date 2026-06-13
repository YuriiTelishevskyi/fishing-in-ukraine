import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SpotsService } from './spots.service';
import { CreateSpotDto } from './dto/create-spot.dto';
import { LangQueryDto } from '../common/lang-query.dto';

@Controller('spots')
export class SpotsController {
  constructor(private readonly spots: SpotsService) {}

  @Get()
  list(@Query() _q: LangQueryDto) {
    return this.spots.listApproved();
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  create(
    @Body() dto: CreateSpotDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.spots.create(dto, file);
  }
}
