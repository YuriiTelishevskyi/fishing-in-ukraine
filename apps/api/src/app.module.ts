import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { DictionariesModule } from './dictionaries/dictionaries.module';
import { HealthController } from './health.controller';
import { MediaModule } from './media/media.module';
import { UPLOADS_ROOT } from './media/storage.service';
import { PrismaModule } from './prisma/prisma.module';
import { WatersModule } from './waters/waters.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: UPLOADS_ROOT,
      serveRoot: '/uploads',
      exclude: ['/uploads/{*any}'],
      serveStaticOptions: { index: false },
    }),
    PrismaModule,
    AdminAuthModule,
    DictionariesModule,
    WatersModule,
    MediaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
