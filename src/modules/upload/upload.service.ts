import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucket: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get('AWS_S3_REGION') || 'ap-southeast-1';
    this.bucket = this.configService.get('AWS_S3_BUCKET') || '';
    this.baseUrl = this.configService.get('S3_BASE_URL') || '';

    if (this.bucket) {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
          secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
        },
      });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (!this.bucket) {
      const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
      const uploadDir = join(__dirname, '..', '..', '..', 'public', 'uploads');
      mkdirSync(uploadDir, { recursive: true });
      writeFileSync(join(uploadDir, filename), file.buffer);
      return `/uploads/${filename}`;
    }

    const key = `uploads/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return this.baseUrl ? `${this.baseUrl}/${key}` : `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async uploadMultiple(files: Express.Multer.File[]): Promise<string[]> {
    return Promise.all(files.map((f) => this.uploadFile(f)));
  }
}
