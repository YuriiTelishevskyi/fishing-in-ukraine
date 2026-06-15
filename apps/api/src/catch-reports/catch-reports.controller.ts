import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CatchReportsService } from './catch-reports.service';
import { CreateCatchReportDto } from './dto/create-catch-report.dto';
import { CatchReportsQueryDto } from './dto/catch-reports-query.dto';

@Controller('waters/:slug/catch-reports')
export class CatchReportsController {
  constructor(private readonly service: CatchReportsService) {}

  @Get()
  list(@Param('slug') slug: string, @Query() q: CatchReportsQueryDto) {
    return this.service.listApproved(slug, q.page, q.lang);
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @UseInterceptors(
    FileInterceptor('photo', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  create(
    @Param('slug') slug: string,
    @Body() dto: CreateCatchReportDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.create(slug, dto, file);
  }
}
