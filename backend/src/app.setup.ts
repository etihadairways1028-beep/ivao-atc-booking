import { INestApplication, ValidationPipe } from '@nestjs/common';

// Shared by main.ts and the e2e tests so both run the exact same app.
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      // Unknown fields are rejected, so nobody can sneak in a `vid` or an `id`.
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
}
