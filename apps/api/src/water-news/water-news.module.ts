import { Module } from '@nestjs/common';
import { WaterNewsService } from './water-news.service';
import { WaterNewsController } from './water-news.controller';
import { AdminWaterNewsController } from './admin-water-news.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [WaterNewsController, AdminWaterNewsController],
  providers: [WaterNewsService],
  exports: [WaterNewsService],
})
export class WaterNewsModule {}
