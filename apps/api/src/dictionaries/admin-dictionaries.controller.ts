import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin-auth/admin.guard';
import { slugify } from '../common/slugify';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDictionaryItemDto } from './dto/create-dictionary-item.dto';

// Duplicate names slugify to an existing slug and surface as 409 (PrismaExceptionFilter, P2002)
// — deliberate: dictionaries should not auto-suffix like waters do.
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminDictionariesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('fish-species')
  createFish(@Body() dto: CreateDictionaryItemDto) {
    return this.prisma.fishSpecies.create({
      data: { name: dto.name, nameEn: dto.nameEn ?? dto.name, slug: slugify(dto.name) },
    });
  }

  @Post('amenities')
  createAmenity(@Body() dto: CreateDictionaryItemDto) {
    return this.prisma.amenity.create({
      data: {
        name: dto.name,
        nameEn: dto.nameEn ?? dto.name,
        slug: slugify(dto.name),
        icon: dto.icon ?? null,
      },
    });
  }
}
