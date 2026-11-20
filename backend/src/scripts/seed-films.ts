import { NestFactory } from '@nestjs/core';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AppModule } from '../app.module';
import { FilmWithScheduleDto } from '../films/dto/films.dto';
import { FilmsRepository } from '../repository/films.repository';

/** Загружает учебные фильмы; уже существующие записи и занятые места сохраняются. */
async function seedFilms(): Promise<void> {
  const root = join(__dirname, '..', '..');
  const films: FilmWithScheduleDto[] = JSON.parse(
    await readFile(join(root, 'test', 'mongodb_initial_stub.json'), 'utf8'),
  );
  for (const film of films) {
    for (const image of [film.image, film.cover]) {
      await access(join(root, 'public', 'content', 'afisha', image));
    }
  }
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const repository = app.get(FilmsRepository);
    let added = 0;
    for (const film of films) {
      if (!(await repository.findById(film.id))) {
        await repository.save(film);
        added++;
      }
    }
    console.log(
      `Добавлено фильмов: ${added}. Уже существовали: ${films.length - added}.`,
    );
  } finally {
    await app.close();
  }
}

seedFilms().catch(() => {
  console.error(
    'Импорт не выполнен. Проверьте MongoDB, .env, исходный JSON и изображения.',
  );
  process.exitCode = 1;
});
