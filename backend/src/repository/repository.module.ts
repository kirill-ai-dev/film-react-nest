import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Film, FilmSchema } from './film.schema';
import { FilmsRepository } from './films.repository';

/** Подключает MongoDB через Nest Mongoose и предоставляет репозиторий. */
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const driver = config.get<string>('DATABASE_DRIVER', 'mongodb');
        if (driver !== 'mongodb') {
          throw new Error('Поддерживается только DATABASE_DRIVER=mongodb');
        }
        return {
          uri: config.getOrThrow<string>('DATABASE_URL'),
          serverSelectionTimeoutMS: 5000,
        };
      },
    }),
    MongooseModule.forFeature([{ name: Film.name, schema: FilmSchema }]),
  ],
  providers: [FilmsRepository],
  exports: [FilmsRepository],
})
export class RepositoryModule {}
