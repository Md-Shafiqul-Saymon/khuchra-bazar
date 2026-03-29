import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/http-exception.filter';

let cachedApp: NestExpressApplication;

async function createApp(): Promise<NestExpressApplication> {
  if (cachedApp) return cachedApp;

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(compression());
  app.use(cookieParser());
  app.set('trust proxy', true);
  app.useGlobalFilters(new GlobalExceptionFilter());

  const rootDir = join(__dirname, '..');
  app.setBaseViewsDir(join(rootDir, 'views'));
  app.setViewEngine('ejs');
  app.useStaticAssets(join(rootDir, 'public'), {
    prefix: '/',
    maxAge: '7d',
    etag: true,
  });

  await app.init();
  cachedApp = app;
  return app;
}

export default async function handler(req: any, res: any) {
  const app = await createApp();
  const expressInstance = app.getHttpAdapter().getInstance();
  return expressInstance(req, res);
}
