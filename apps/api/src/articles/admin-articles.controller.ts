import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminGuard } from '../admin-auth/admin.guard';
import { AdminArticlesService } from './admin-articles.service';
import { AdminArticlesQueryDto } from './dto/admin-articles-query.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Controller('admin/articles')
@UseGuards(AdminGuard)
export class AdminArticlesController {
  constructor(private readonly articles: AdminArticlesService) {}

  @Get()
  list(@Query() query: AdminArticlesQueryDto) {
    return this.articles.list(query);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.articles.byId(id);
  }

  @Post()
  create(@Body() dto: CreateArticleDto) {
    return this.articles.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.articles.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.articles.remove(id);
  }

  @Post(':id/cover')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  uploadCover(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.articles.uploadCover(id, file);
  }
}
