import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({ origin: true, credentials: true });
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

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`খুচরা বাজার running on http://localhost:${port}`);
}
bootstrap();
