import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, type PutObjectCommandInput } from '@aws-sdk/client-s3';
import { writeFileSync, mkdirSync } from 'fs';
import { basename, dirname, join, posix } from 'path';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucket: string;
  private baseUrl: string;
  private region: string;
  private publicRead: boolean;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get('AWS_S3_REGION') || 'ap-southeast-1';
    this.bucket = this.configService.get('AWS_S3_BUCKET') || '';
    this.baseUrl = UploadService.normalizeBaseUrl(this.configService.get('S3_BASE_URL') || '');
    this.publicRead = this.configService.get('AWS_S3_PUBLIC_READ') === 'true';

    if (this.bucket) {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
          secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
        },
      });
    }
  }

  /** Strip paths / `..` from client-provided names so S3 keys and public URLs never contain `/../`. */
  private sanitizeFilename(original: string | undefined): string {
    if (!original || typeof original !== 'string') return 'image';
    let name = original.replace(/\\/g, '/');
    name = basename(name);
    name = name.replace(/\.\./g, '').replace(/^\.+/, '');
    name = name.replace(/\s+/g, '-');
    name = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!name || /^[._-]+$/.test(name)) return `image-${Date.now()}`;
    return name;
  }

  private normalizeLocalRelPath(key: string): string {
    return key
      .split('/')
      .map((seg) => seg.trim())
      .filter((seg) => seg && seg !== '.' && seg !== '..')
      .join('/');
  }

  private cacheBufferLocally(key: string, buffer: Buffer): string {
    const relPath = this.normalizeLocalRelPath(key);
    if (!relPath) {
      throw new BadRequestException('Invalid storage path');
    }
    const rootDir = join(__dirname, '..', '..', '..', 'public');
    const fullPath = join(rootDir, relPath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, buffer);
    return `/${relPath}`;
  }

  /** Collapse bad path segments in S3_BASE_URL (e.g. `/../`) and trim slashes. */
  static normalizeBaseUrl(raw: string): string {
    const t = raw.trim().replace(/\/+$/, '');
    if (!t) return '';
    try {
      const u = new URL(t);
      let p = posix.normalize(u.pathname.replace(/\/+/g, '/') || '/');
      if (p === '/') p = '';
      else if (p.endsWith('/')) p = p.slice(0, -1);
      return `${u.origin}${p}`;
    } catch {
      return t.replace(/\/\.\//g, '/').replace(/\/\.\.$/, '');
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Invalid or empty file upload');
    }
    const safeName = this.sanitizeFilename(file.originalname);

    if (!this.bucket) {
      const filename = `${Date.now()}-${safeName}`;
      const uploadDir = join(__dirname, '..', '..', '..', 'public', 'uploads');
      mkdirSync(uploadDir, { recursive: true });
      writeFileSync(join(uploadDir, filename), file.buffer);
      return `/uploads/${filename}`;
    }

    const key = `uploads/${Date.now()}-${safeName}`;

    await this.putObjectToS3({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000',
    });

    // Keep a local copy so rendering can serve from project/static first.
    this.cacheBufferLocally(key, file.buffer);

    return this.buildPublicObjectUrl(key);
  }

  /**
   * PutObject; if ACL public-read is rejected (common when "Bucket owner enforced" / ACLs off), retry without ACL.
   */
  private async putObjectToS3(input: PutObjectCommandInput): Promise<void> {
    if (this.publicRead) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({ ...input, ACL: 'public-read' }),
        );
        return;
      } catch (e: any) {
        const name = e?.name || e?.Code;
        const msg = String(e?.message || '').toLowerCase();
        const aclUnsupported =
          name === 'AccessControlListNotSupported' ||
          msg.includes('does not allow acl') ||
          msg.includes('acl is disabled') ||
          msg.includes('bucketownerenforced');
        if (!aclUnsupported) throw e;
      }
    }
    await this.s3Client.send(new PutObjectCommand(input));
  }

  /** Encode each path segment so special characters in filenames work in browsers. */
  private encodeKeyForUrl(key: string): string {
    return key
      .split('/')
      .filter((seg) => seg.length > 0)
      .map((seg) => encodeURIComponent(seg))
      .join('/');
  }

  private buildPublicObjectUrl(key: string): string {
    const encoded = this.encodeKeyForUrl(key);
    if (this.baseUrl) {
      return `${this.baseUrl}/${encoded}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encoded}`;
  }

  async uploadMultiple(files: Express.Multer.File[] | undefined): Promise<string[]> {
    if (!files?.length) return [];
    return Promise.all(files.map((f) => this.uploadFile(f)));
  }
}
