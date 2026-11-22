import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Film } from './film.entity';
import { Schedule } from './schedule.entity';
import { FilmsRepository } from './films.repository';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = new URL(config.getOrThrow<string>('DATABASE_URL'));
        const password = config.get<string>('DATABASE_PASSWORD');
        const username = config.get<string>('DATABASE_USERNAME');

        return {
          type: 'postgres' as const,
          host: databaseUrl.hostname,
          port: Number(databaseUrl.port || 5432),
          database: databaseUrl.pathname.slice(1),
          username: username || decodeURIComponent(databaseUrl.username),
          password: password || decodeURIComponent(databaseUrl.password),
          entities: [Film, Schedule],
          synchronize: false,
        };
      },
    }),
  ],
  providers: [FilmsRepository],
  exports: [FilmsRepository],
})
export class RepositoryModule {}
