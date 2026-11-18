import { Connection, createConnection } from 'mongoose';
import { AppConfig } from '../app.config.provider';
import { filmSchema } from './film.schema';

/** Открывает отдельное подключение Mongoose до запуска HTTP-сервера. */
export const databaseProvider = {
  provide: 'DATABASE_CONNECTION',
  inject: ['CONFIG'],
  useFactory: async (config: AppConfig): Promise<Connection> => {
    const connection = createConnection(config.database.url, {
      serverSelectionTimeoutMS: 5000,
    });
    try {
      return await connection.asPromise();
    } catch {
      await connection.close();
      throw new Error(
        'Не удалось подключиться к MongoDB. Проверьте DATABASE_URL и запуск базы.',
      );
    }
  },
};

/** Создаёт модель коллекции films и дожидается уникального индекса по id. */
export const filmModelProvider = {
  provide: 'FILM_MODEL',
  inject: ['DATABASE_CONNECTION'],
  useFactory: async (connection: Connection) => {
    const model = connection.model('Film', filmSchema);
    await model.init();
    return model;
  },
};
