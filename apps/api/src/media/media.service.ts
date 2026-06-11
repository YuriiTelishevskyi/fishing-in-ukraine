import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MediaDto } from '@fishing/shared';
import sharp from 'sharp';
import { toMediaDto } from '../waters/waters.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

const SIZES = [
  { suffix: 'thumb', width: 320 },
  { suffix: 'card', width: 640 },
  { suffix: 'full', width: 1600 },
] as const;

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(waterId: string, file: Express.Multer.File): Promise<MediaDto> {
    if (!file || !ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('File is required or unsupported type');
    }
    const water = await this.prisma.water.findUnique({ where: { id: waterId } });
    if (!water) throw new NotFoundException(`Water ${waterId} not found`);

    const last = await this.prisma.media.findFirst({
      where: { waterId },
      orderBy: { sortOrder: 'desc' },
    });

    const id = randomUUID();
    try {
      for (const { suffix, width } of SIZES) {
        const buf = await sharp(file.buffer)
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        await this.storage.save(this.relPath(waterId, id, suffix), buf);
      }
    } catch (e) {
      // best-effort cleanup of partially written variants, then surface a clean 400
      for (const { suffix } of SIZES) {
        await this.storage.delete(this.relPath(waterId, id, suffix));
      }
      throw new BadRequestException('Could not process image');
    }

    const media = await this.prisma.media.create({
      data: {
        id,
        waterId,
        url: `/uploads/${this.relPath(waterId, id, 'full')}`,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
    return toMediaDto(media);
  }

  /** Reindexes sortOrder 0..n for the given water; ids must be the FULL media set of that water. */
  async reorder(waterId: string, dto: { ids: string[] }): Promise<{ ok: true }> {
    const results = await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.media.updateMany({ where: { id, waterId }, data: { sortOrder: index } }),
      ),
    );
    const updatedCount = results.reduce((sum, r) => sum + r.count, 0);
    if (updatedCount !== dto.ids.length) {
      throw new NotFoundException('One or more media ids not found for this water');
    }
    return { ok: true };
  }

  async remove(id: string): Promise<{ ok: true }> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException(`Media ${id} not found`);
    for (const { suffix } of SIZES) {
      await this.storage.delete(this.relPath(media.waterId, media.id, suffix));
    }
    await this.prisma.media.delete({ where: { id } });
    return { ok: true };
  }

  private relPath(waterId: string, mediaId: string, suffix: string): string {
    return `waters/${waterId}/${mediaId}-${suffix}.webp`;
  }
}
