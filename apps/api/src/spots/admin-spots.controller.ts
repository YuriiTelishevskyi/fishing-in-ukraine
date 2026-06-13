import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin-auth/admin.guard';
import { SpotsService } from './spots.service';
import { AdminSpotsQueryDto } from './dto/admin-spots-query.dto';
import { ModerateSpotDto } from './dto/moderate-spot.dto';

@Controller('admin/spots')
@UseGuards(AdminGuard)
export class AdminSpotsController {
  constructor(private readonly spots: SpotsService) {}

  @Get()
  list(@Query() q: AdminSpotsQueryDto) {
    return this.spots.adminList(q);
  }

  @Patch(':id')
  moderate(@Param('id') id: string, @Body() dto: ModerateSpotDto) {
    return this.spots.moderate(id, dto.status as any);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.spots.remove(id);
  }
}
