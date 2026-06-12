import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { MarkdownService } from '../common/markdown.service';
import { MediaModule } from '../media/media.module';
import { AdminArticlesController } from './admin-articles.controller';
import { AdminArticlesService } from './admin-articles.service';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [AdminAuthModule, MediaModule],
  controllers: [ArticlesController, AdminArticlesController],
  providers: [ArticlesService, AdminArticlesService, MarkdownService],
  exports: [MarkdownService],
})
export class ArticlesModule {}
