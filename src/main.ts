import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/http-exception.filter';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({ origin: true, credentials: true });
  app.use(compression());
  app.use(cookieParser());
  app.set('trust proxy', true);
  app.useGlobalFilters(new GlobalExceptionFilter());

  const rootDir = process.cwd();
  app.setBaseViewsDir(join(rootDir, 'views'));
  app.setViewEngine('ejs');
  app.useStaticAssets(join(rootDir, 'public'), {
    prefix: '/',
    maxAge: '7d',
    etag: true,
  });

  // Warm up MongoDB before accepting traffic — Atlas free tier can take 2-3 min to wake
  try {
    const conn = app.get<Connection>(getConnectionToken());
    if (conn.readyState !== 1) {
      console.log('Waiting for MongoDB connection…');
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('MongoDB connect timeout')), 175000);
        conn.once('connected', () => { clearTimeout(t); resolve(); });
        conn.once('error', (e) => { clearTimeout(t); reject(e); });
      });
    }
    console.log('MongoDB ready');
  } catch (e) {
    console.warn('MongoDB warmup skipped:', (e as Error).message);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`খুচরা বাজার running on http://localhost:${port}`);
}
bootstrap();
