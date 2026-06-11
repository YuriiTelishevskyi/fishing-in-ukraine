import { Controller, Get, Header } from '@nestjs/common';
import { SeoService } from './seo.service';

@Controller()
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  sitemap() {
    return this.seo.sitemap();
  }
}
