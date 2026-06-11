import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminGuard } from '../admin-auth/admin.guard';
import { ReorderMediaDto } from './dto/reorder-media.dto';
import { MediaService } from './media.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('waters/:id/media')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  upload(@Param('id') waterId: string, @UploadedFile() file: Express.Multer.File) {
    return this.media.upload(waterId, file);
  }

  @Patch('waters/:id/media/reorder')
  reorder(@Param('id') waterId: string, @Body() dto: ReorderMediaDto) {
    return this.media.reorder(waterId, dto);
  }

  @Delete('media/:id')
  remove(@Param('id') id: string) {
    return this.media.remove(id);
  }
}
