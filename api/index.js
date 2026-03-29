require('reflect-metadata');
const path = require('path');
const { NestFactory } = require('@nestjs/core');
const compression = require('compression');
const cookieParser = require('cookie-parser');
require('ejs');

const { AppModule } = require('../dist/app.module');
const { GlobalExceptionFilter } = require('../dist/common/http-exception.filter');

let handler;

module.exports = async (req, res) => {
  if (!handler) {
    const app = await NestFactory.create(AppModule);
    app.use(compression());
    app.use(cookieParser());
    app.set('trust proxy', true);
    app.useGlobalFilters(new GlobalExceptionFilter());

    const rootDir = path.join(__dirname, '..');
    app.setBaseViewsDir(path.join(rootDir, 'views'));
    app.setViewEngine('ejs');
    app.useStaticAssets(path.join(rootDir, 'public'), {
      prefix: '/',
      maxAge: '7d',
      etag: true,
    });

    await app.init();
    handler = app.getHttpAdapter().getInstance();
  }
  return handler(req, res);
};
