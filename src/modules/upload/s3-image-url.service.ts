import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UploadService } from './upload.service';

@Injectable()
export class S3ImageUrlService {
  private bucket: string;
  private region: string;
  private baseUrl: string;
  private expiresIn: number;
  private readonly clientCache = new Map<string, S3Client>();
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get('AWS_S3_BUCKET') || '';
    this.region = this.config.get('AWS_S3_REGION') || 'ap-southeast-1';
    this.baseUrl = UploadService.normalizeBaseUrl(this.config.get('S3_BASE_URL') || '');
    this.expiresIn = Math.min(
      Math.max(parseInt(this.config.get('AWS_S3_SIGNED_URL_EXPIRES') || '604800', 10), 60),
      604800,
    );
    this.accessKeyId = this.config.get('AWS_ACCESS_KEY_ID') || '';
    this.secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY') || '';
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * For https://BUCKET.s3.REGION.amazonaws.com/key — use REGION from the URL for SigV4,
   * so presigning still works if AWS_S3_REGION is missing/wrong on the server (e.g. Vercel).
   */
  private parseVirtualHostedUrl(url: string): { key: string; region: string } | null {
    if (!this.bucket || !url || url.startsWith('/')) return null;
    const clean = url.split('?')[0];
    try {
      const u = new URL(clean);
      const re = new RegExp(
        `^${this.escapeRegex(this.bucket)}\\.s3\\.([a-z0-9-]+)\\.amazonaws\\.com$`,
        'i',
      );
      const m = u.hostname.match(re);
      if (m) {
        const key = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
        if (!key) return null;
        return { key, region: m[1] };
      }
      if (this.baseUrl) {
        const b = new URL(this.baseUrl);
        if (u.hostname.toLowerCase() === b.hostname.toLowerCase()) {
          let path = u.pathname.replace(/^\/+/, '');
          const basePath = b.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
          if (basePath && path.startsWith(`${basePath}/`)) {
            path = path.slice(basePath.length + 1);
          }
          if (!path) return null;
          return { key: decodeURIComponent(path), region: this.region };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private getS3Client(region: string): S3Client | null {
    if (!this.accessKeyId || !this.secretAccessKey) return null;
    let c = this.clientCache.get(region);
    if (!c) {
      c = new S3Client({
        region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });
      this.clientCache.set(region, c);
    }
    return c;
  }

  /** Object key for our bucket, or null if URL is local / external / not ours. */
  extractKey(url: string): string | null {
    return this.parseVirtualHostedUrl(url)?.key ?? null;
  }

  async signUrl(url: string | undefined | null): Promise<string> {
    if (!url || typeof url !== 'string') return url || '';
    if (!this.bucket) return url;
    const parsed = this.parseVirtualHostedUrl(url);
    if (!parsed) return url;
    const client = this.getS3Client(parsed.region);
    if (!client) return url;
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: parsed.key });
    return getSignedUrl(client, cmd, { expiresIn: this.expiresIn });
  }

  async signUrls(urls: string[]): Promise<string[]> {
    return Promise.all(urls.map((u) => this.signUrl(u)));
  }

  async signProduct<T extends { images?: string[] }>(product: T | null): Promise<T | null> {
    if (!product) return null;
    if (!product.images?.length) return product;
    const images = await this.signUrls(product.images);
    return { ...product, images };
  }

  async signProducts<T extends { images?: string[] }>(products: T[]): Promise<T[]> {
    return Promise.all(products.map((p) => this.signProduct(p) as Promise<T>));
  }

  async signSettings<T extends { bannerImages?: string[] }>(settings: T | null): Promise<T | null> {
    if (!settings?.bannerImages?.length) return settings;
    const bannerImages = await this.signUrls(settings.bannerImages);
    return { ...settings, bannerImages };
  }

  async signOrder<T extends { items?: { image?: string }[] }>(order: T | null): Promise<T | null> {
    if (!order?.items?.length) return order;
    const items = await Promise.all(
      order.items.map(async (item) => ({
        ...item,
        image: item.image ? await this.signUrl(item.image) : item.image,
      })),
    );
    return { ...order, items };
  }
}
