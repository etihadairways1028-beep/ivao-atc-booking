import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { VID_HEADER } from './auth/vid.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  // Interactive API docs at /api/docs.
  const config = new DocumentBuilder()
    .setTitle('ATC Booking API')
    .setDescription(
      `Book IVAO ATC positions. Write routes identify the user with the ${VID_HEADER} header.`,
    )
    .addApiKey({ type: 'apiKey', in: 'header', name: VID_HEADER }, 'vid')
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, config),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
