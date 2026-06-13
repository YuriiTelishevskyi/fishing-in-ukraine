import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { MediaModule } from '../media/media.module';
import { SpotsController } from './spots.controller';
import { AdminSpotsController } from './admin-spots.controller';
import { SpotsService } from './spots.service';

@Module({
  imports: [AdminAuthModule, MediaModule],
  controllers: [SpotsController, AdminSpotsController],
  providers: [SpotsService],
  exports: [SpotsService],
})
export class SpotsModule {}
