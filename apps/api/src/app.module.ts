import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { DictionariesModule } from './dictionaries/dictionaries.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, DictionariesModule],
  controllers: [HealthController],
})
export class AppModule {}
