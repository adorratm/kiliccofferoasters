import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createRequire } from 'module';
import { join } from 'path';
import { AppModule } from '@/app.module';

function resolveSwaggerUiPath(): string {
  // Webpack bundle'da __dirname/require bozulduğu için cwd üzerinden çöz
  const requireFromRoot = createRequire(join(process.cwd(), 'package.json'));
  try {
    return requireFromRoot('swagger-ui-dist').getAbsoluteFSPath() as string;
  } catch {
    const requireFromMonorepo = createRequire(
      join(process.cwd(), '..', 'package.json'),
    );
    return requireFromMonorepo('swagger-ui-dist').getAbsoluteFSPath() as string;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const frontendUrl = config.get<string>('frontendUrl') || 'http://localhost:3000';
  const adminUrl = config.get<string>('adminUrl') || 'http://localhost:3001';

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Webpack swagger-ui asset çözümü. index:false zorunlu —
  // aksi halde swagger-ui-dist'in varsayılan Petstore index.html'i servis edilir.
  const swaggerUiPath = resolveSwaggerUiPath();
  app.useStaticAssets(swaggerUiPath, {
    prefix: '/docs/',
    index: false,
  });

  app.enableCors({
    origin: [frontendUrl, adminUrl],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Kılıç Coffee Roasters API')
    .setDescription('E-ticaret, ödeme, kargo ve pazar yeri API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    customSwaggerUiPath: swaggerUiPath,
  });

  const port = config.get<number>('apiPort') || 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port} — docs at /docs`);
}

bootstrap();
