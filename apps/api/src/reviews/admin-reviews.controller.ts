import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin-auth/admin.guard';
import { ReviewsService } from './reviews.service';
import { AdminReviewsQueryDto } from './dto/admin-reviews-query.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';

@Controller('admin/reviews')
@UseGuards(AdminGuard)
export class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(@Query() q: AdminReviewsQueryDto) {
    return this.reviews.adminList(q);
  }

  @Patch(':id')
  moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    return this.reviews.moderate(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviews.remove(id);
  }
}
