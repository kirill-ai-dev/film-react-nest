import { ConfigService } from '@nestjs/config';

/** Настройки приложения, прочитанные из переменных окружения. */
export interface AppConfig {
  database: AppConfigDatabase;
}

/** Адрес базы и выбранный способ хранения данных. */
export interface AppConfigDatabase {
  driver: string;
  url: string;
}

/** Получает настройки MongoDB после загрузки .env через ConfigModule. */
export const configProvider = {
  provide: 'CONFIG',
  inject: [ConfigService],
  useFactory: (config: ConfigService): AppConfig => {
    const driver = config.get<string>('DATABASE_DRIVER', 'mongodb');
    if (driver !== 'mongodb') {
      throw new Error('Поддерживается только DATABASE_DRIVER=mongodb');
    }
    return {
      database: {
        driver,
        url: config.getOrThrow<string>('DATABASE_URL'),
      },
    };
  },
};
