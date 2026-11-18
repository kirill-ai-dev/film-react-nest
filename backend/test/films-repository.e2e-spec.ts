import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Connection, createConnection } from 'mongoose';
import { FilmWithScheduleDto } from '../src/films/dto/films.dto';
import { filmSchema } from '../src/repository/film.schema';
import { FilmsRepository } from '../src/repository/films.repository';

/** Проверяем настоящую MongoDB в отдельной базе, не затрагивая рабочие фильмы. */
describe('FilmsRepository (MongoDB)', () => {
  let connection: Connection;
  let repository: FilmsRepository;
  const film: FilmWithScheduleDto = JSON.parse(
    readFileSync(join(__dirname, 'mongodb_initial_stub.json'), 'utf8'),
  )[0];

  beforeAll(async () => {
    connection = await createConnection(
      process.env.TEST_DATABASE_URL ?? 'mongodb://127.0.0.1:27017',
      {
        dbName: `film_repository_test_${randomUUID().replace(/-/g, '')}`,
        serverSelectionTimeoutMS: 5000,
      },
    ).asPromise();
    const model = connection.model('Film', filmSchema);
    await model.init();
    repository = new FilmsRepository(model);
  });

  beforeEach(async () => {
    await connection.collection('films').deleteMany({});
  });

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
  });

  it('читает пустую коллекцию', async () => {
    await expect(repository.findAll()).resolves.toEqual([]);
  });

  it('сохраняет фильм вместе с расписанием и находит его по UUID', async () => {
    const saved = await repository.save(film);
    const found = await repository.findById(film.id);
    expect(found).toEqual(saved);
    expect(found.schedule).toHaveLength(film.schedule.length);
    expect(found.schedule[0].hall).toBe(Number(film.schedule[0].hall));
    const stored = await connection
      .collection('films')
      .findOne({ id: film.id });
    expect(stored._id).toBeDefined();
    expect(stored.schedule[0]._id).toBeUndefined();
  });

  it('возвращает список афиши без расписания и служебных полей', async () => {
    await repository.save(film);
    const films = await repository.findAll();
    expect(films).toHaveLength(1);
    expect(films[0].id).toBe(film.id);
    expect(films[0]).not.toHaveProperty('schedule');
    expect(films[0]).not.toHaveProperty('_id');
  });

  it('обновляет фильм без создания дубликата', async () => {
    await repository.save(film);
    await repository.save({ ...film, title: 'Новое название' });
    expect(await connection.collection('films').countDocuments()).toBe(1);
    expect((await repository.findById(film.id)).title).toBe('Новое название');
  });

  it('возвращает null для неизвестного UUID', async () => {
    await expect(repository.findById('unknown')).resolves.toBeNull();
  });

  it('не сохраняет фильм с отрицательной ценой', async () => {
    const invalid = { ...film, schedule: [{ ...film.schedule[0], price: -1 }] };
    await expect(repository.save(invalid)).rejects.toThrow();
    expect(await connection.collection('films').countDocuments()).toBe(0);
  });

  it('не сохраняет фильм без обязательного названия', async () => {
    await expect(
      repository.save({ ...film, title: undefined }),
    ).rejects.toThrow();
    expect(await connection.collection('films').countDocuments()).toBe(0);
  });

  it('атомарно добавляет свободные места в сеанс', async () => {
    await repository.save(film);
    const reserved = await repository.reserveSeats(
      film.id,
      film.schedule[0].id,
      ['2:3', '2:4'],
    );
    expect(reserved.schedule[0].taken).toEqual(['2:3', '2:4']);
  });

  it('отклоняет повторное занятие места', async () => {
    await repository.save(film);
    await repository.reserveSeats(film.id, film.schedule[0].id, ['2:3']);
    await expect(
      repository.reserveSeats(film.id, film.schedule[0].id, ['2:3']),
    ).resolves.toBeNull();
    expect((await repository.findById(film.id)).schedule[0].taken).toEqual([
      '2:3',
    ]);
  });

  it('при параллельной брони одно место достаётся только одному запросу', async () => {
    await repository.save(film);
    const results = await Promise.all([
      repository.reserveSeats(film.id, film.schedule[0].id, ['3:3']),
      repository.reserveSeats(film.id, film.schedule[0].id, ['3:3']),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((value) => value === null)).toHaveLength(1);
  });

  it('изолирует параллельные транзакции и не переносит сессию в обычные запросы', async () => {
    await repository.save(film);
    const secondFilm = { ...film, id: 'second-film' };
    await repository.save(secondFilm);
    let firstReady: () => void;
    let secondCommitted: () => void;
    const firstStarted = new Promise<void>((resolve) => {
      firstReady = resolve;
    });
    const secondFinished = new Promise<void>((resolve) => {
      secondCommitted = resolve;
    });

    const first = repository.withTransaction(async (transaction) => {
      await transaction.reserveSeats(film.id, film.schedule[0].id, ['1:1']);
      firstReady();
      await secondFinished;
      throw new Error('Отменяем только первый заказ');
    });
    const second = firstStarted.then(async () => {
      try {
        await repository.withTransaction(async (transaction) => {
          await transaction.reserveSeats(
            secondFilm.id,
            secondFilm.schedule[0].id,
            ['1:2'],
          );
        });
      } finally {
        secondCommitted();
      }
    });
    const results = await Promise.allSettled([first, second]);
    expect(results.map((result) => result.status)).toEqual([
      'rejected',
      'fulfilled',
    ]);
    expect((await repository.findById(film.id)).schedule[0].taken).toEqual([]);
    expect(
      (await repository.findById(secondFilm.id)).schedule[0].taken,
    ).toEqual(['1:2']);
  });
});
