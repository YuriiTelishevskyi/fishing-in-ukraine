import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsQueryDto } from './dto/reviews-query.dto';

@Controller('waters/:slug/reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(@Param('slug') slug: string, @Query() q: ReviewsQueryDto) {
    return this.reviews.listApproved(slug, q.page);
  }

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  create(@Param('slug') slug: string, @Body() dto: CreateReviewDto) {
    return this.reviews.create(slug, dto);
  }
}
