import { ConfigService } from '@nestjs/config';
import { configProvider } from './app.config.provider';

describe('Настройки MongoDB', () => {
  it('получает адрес базы из конфигурации', () => {
    const config = new ConfigService({
      DATABASE_URL: 'mongodb://127.0.0.1:27017/test',
    });
    expect(configProvider.useFactory(config)).toEqual({
      database: { driver: 'mongodb', url: 'mongodb://127.0.0.1:27017/test' },
    });
  });

  it('останавливает запуск, если адрес базы не задан', () => {
    const config = {
      get: () => 'mongodb',
      getOrThrow: () => {
        throw new Error('DATABASE_URL is missing');
      },
    } as unknown as ConfigService;
    expect(() => configProvider.useFactory(config)).toThrow('DATABASE_URL');
  });

  it('отклоняет неподдерживаемый драйвер', () => {
    const config = new ConfigService({ DATABASE_DRIVER: 'unknown' });
    expect(() => configProvider.useFactory(config)).toThrow(
      'DATABASE_DRIVER=mongodb',
    );
  });
});
