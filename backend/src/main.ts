import 'dotenv/config';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DevLogger } from './logger/dev.logger';
import { JsonLogger } from './logger/json.logger';
import { TskvLogger } from './logger/tskv.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const loggerFormat = config.get<string>('LOGGER_FORMAT', 'dev');
  const logger =
    loggerFormat === 'json'
      ? new JsonLogger()
      : loggerFormat === 'tskv'
        ? new TskvLogger()
        : new DevLogger();
  app.useLogger(logger);
  app.enableShutdownHooks();
  // У обоих адресов заказа уже есть полный путь в контроллере.
  app.setGlobalPrefix('api/afisha', {
    exclude: [
      { path: 'order', method: RequestMethod.POST },
      { path: 'api/afisha/order', method: RequestMethod.POST },
    ],
  });
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  const port = Number(config.get<string>('PORT', '3000'));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT должен быть целым числом от 1 до 65535');
  }
  await app.listen(port);
}
bootstrap();
