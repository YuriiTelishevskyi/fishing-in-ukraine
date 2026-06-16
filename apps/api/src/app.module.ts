import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { ArticlesModule } from './articles/articles.module';
import { BiteModule } from './bite/bite.module';
import { CatchReportsModule } from './catch-reports/catch-reports.module';
import { DictionariesModule } from './dictionaries/dictionaries.module';
import { HealthController } from './health.controller';
import { MediaModule } from './media/media.module';
import { UPLOADS_ROOT } from './media/storage.service';
import { PrismaModule } from './prisma/prisma.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SeoModule } from './seo/seo.module';
import { SpotsModule } from './spots/spots.module';
import { WaterNewsModule } from './water-news/water-news.module';
import { WatersModule } from './waters/waters.module';
import { WeatherModule } from './weather/weather.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Generous global limit: behind the SSR proxy all server-rendered traffic shares
    // the web container's IP, so per-IP buckets aggregate many users. Login has its
    // own strict 5/min @Throttle.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 1000 }]),
    ServeStaticModule.forRoot({
      rootPath: UPLOADS_ROOT,
      serveRoot: '/uploads',
      exclude: ['/uploads/{*any}'],
      // Upload filenames are content-addressed by uuid, so the bytes behind a
      // given URL never change — serve them as long-lived immutable assets.
      serveStaticOptions: {
        index: false,
        immutable: true,
        maxAge: '365d',
      },
    }),
    PrismaModule,
    AdminAuthModule,
    DictionariesModule,
    WatersModule,
    MediaModule,
    ArticlesModule,
    ReviewsModule,
    SpotsModule,
    SeoModule,
    WeatherModule,
    BiteModule,
    CatchReportsModule,
    WaterNewsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
