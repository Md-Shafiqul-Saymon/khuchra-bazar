import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { S3ImageUrlService } from './s3-image-url.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, S3ImageUrlService],
  exports: [UploadService, S3ImageUrlService],
})
export class UploadModule {}
