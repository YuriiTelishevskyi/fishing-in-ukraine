import { Module } from '@nestjs/common';
import { WatersController } from './waters.controller';
import { WatersService } from './waters.service';

@Module({
  controllers: [WatersController],
  providers: [WatersService],
})
export class WatersModule {}
