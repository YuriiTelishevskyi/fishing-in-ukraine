import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminWatersController } from './admin-waters.controller';
import { AdminWatersService } from './admin-waters.service';
import { WatersController } from './waters.controller';
import { WatersService } from './waters.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [WatersController, AdminWatersController],
  providers: [WatersService, AdminWatersService],
})
export class WatersModule {}
