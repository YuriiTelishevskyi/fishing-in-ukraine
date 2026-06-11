import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin-auth/admin.guard';
import { AdminWatersService } from './admin-waters.service';
import { AdminWatersQueryDto } from './dto/admin-waters-query.dto';
import { CreateWaterDto } from './dto/create-water.dto';
import { UpdateWaterDto } from './dto/update-water.dto';

@Controller('admin/waters')
@UseGuards(AdminGuard)
export class AdminWatersController {
  constructor(private readonly waters: AdminWatersService) {}

  @Get()
  list(@Query() query: AdminWatersQueryDto) {
    return this.waters.list(query);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.waters.byId(id);
  }

  @Post()
  create(@Body() dto: CreateWaterDto) {
    return this.waters.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWaterDto) {
    return this.waters.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.waters.remove(id);
  }
}
