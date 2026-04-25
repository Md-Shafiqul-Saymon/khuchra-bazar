import {
  Controller, Get, Post, UseGuards,
  UseInterceptors, UploadedFile, UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../admin/jwt-auth.guard';
import { ProductService } from '../product/product.service';

@Controller('api/upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly productService: ProductService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('library')
  async imageLibrary() {
    const [localImages, productImages] = await Promise.all([
      this.uploadService.listLocalUploadImages(),
      this.productService.listDistinctImageUrls(),
    ]);

    const map = new Map<string, { url: string; name: string; source: 'local' | 'product' | 'both' }>();

    for (const img of localImages) {
      map.set(img.url, { url: img.url, name: img.name, source: 'local' });
    }

    for (const url of productImages) {
      const safeUrl = String(url || '').trim();
      if (!safeUrl) continue;

      const existing = map.get(safeUrl);
      const filename = decodeURIComponent(safeUrl.split('?')[0].split('/').pop() || 'image');

      if (!existing) {
        map.set(safeUrl, { url: safeUrl, name: filename, source: 'product' });
      } else if (existing.source === 'local') {
        existing.source = 'both';
      }
    }

    return {
      images: Array.from(map.values()),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const url = await this.uploadService.uploadFile(file);
    return { url };
  }

  @UseGuards(JwtAuthGuard)
  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    const list = Array.isArray(files) ? files : files ? [files] : [];
    const urls = await this.uploadService.uploadMultiple(list);
    return { urls };
  }
}
