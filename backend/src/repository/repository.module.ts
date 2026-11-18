import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Connection } from 'mongoose';
import { configProvider } from '../app.config.provider';
import { databaseProvider, filmModelProvider } from './database.provider';
import { FilmsRepository } from './films.repository';

/** Подключает MongoDB и предоставляет репозиторий другим модулям. */
@Module({
  imports: [ConfigModule],
  providers: [
    configProvider,
    databaseProvider,
    filmModelProvider,
    FilmsRepository,
  ],
  exports: [FilmsRepository, databaseProvider],
})
export class RepositoryModule implements OnModuleDestroy {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly connection: Connection,
  ) {}

  /** Закрывает подключение при остановке приложения и завершении тестов. */
  async onModuleDestroy(): Promise<void> {
    await this.connection.close();
  }
}
