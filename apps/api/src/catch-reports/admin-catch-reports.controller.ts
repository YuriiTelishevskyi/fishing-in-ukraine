import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin-auth/admin.guard';
import { CatchReportsService } from './catch-reports.service';
import { AdminCatchReportsQueryDto } from './dto/admin-catch-reports-query.dto';
import { ModerateCatchReportDto } from './dto/moderate-catch-report.dto';

@Controller('admin/catch-reports')
@UseGuards(AdminGuard)
export class AdminCatchReportsController {
  constructor(private readonly service: CatchReportsService) {}

  @Get()
  list(@Query() q: AdminCatchReportsQueryDto) {
    return this.service.adminList(q);
  }

  @Patch(':id')
  moderate(@Param('id') id: string, @Body() dto: ModerateCatchReportDto) {
    return this.service.moderate(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
