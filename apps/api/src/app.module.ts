import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { DictionariesModule } from './dictionaries/dictionaries.module';
import { WatersModule } from './waters/waters.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AdminAuthModule, DictionariesModule, WatersModule],
  controllers: [HealthController],
})
export class AppModule {}
