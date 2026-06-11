import { Injectable } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

export const UPLOADS_ROOT = join(process.cwd(), 'uploads');

/** Local-disk storage. Swap this class for an S3/R2 implementation later. */
@Injectable()
export class StorageService {
  async save(relPath: string, data: Buffer): Promise<void> {
    const abs = join(UPLOADS_ROOT, relPath);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, data);
  }

  async delete(relPath: string): Promise<void> {
    await rm(join(UPLOADS_ROOT, relPath), { force: true });
  }

  async deleteDir(relPath: string): Promise<void> {
    await rm(join(UPLOADS_ROOT, relPath), { recursive: true, force: true });
  }
}
