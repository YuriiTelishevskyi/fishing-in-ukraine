import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { WaterNewsService } from './water-news.service';
import { CreateWaterNewsDto } from './dto/create-water-news.dto';
import { UpdateWaterNewsDto } from './dto/update-water-news.dto';
import { AdminWaterNewsQueryDto } from './dto/admin-water-news-query.dto';
import { AdminGuard } from '../admin-auth/admin.guard';

@Controller('admin/water-news')
@UseGuards(AdminGuard)
export class AdminWaterNewsController {
  constructor(private readonly waterNewsService: WaterNewsService) {}

  @Get()
  list(@Query() q: AdminWaterNewsQueryDto) {
    return this.waterNewsService.adminList(q);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.waterNewsService.byId(id);
  }

  @Post()
  create(@Body() dto: CreateWaterNewsDto) {
    return this.waterNewsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWaterNewsDto) {
    return this.waterNewsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.waterNewsService.remove(id);
  }
}
