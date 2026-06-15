import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { MediaModule } from '../media/media.module';
import { CatchReportsController } from './catch-reports.controller';
import { CatchReportsService } from './catch-reports.service';

@Module({
  imports: [AdminAuthModule, MediaModule],
  controllers: [CatchReportsController],
  providers: [CatchReportsService],
  exports: [CatchReportsService],
})
export class CatchReportsModule {}
