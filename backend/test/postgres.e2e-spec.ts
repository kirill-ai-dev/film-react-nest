import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { DataSource } from 'typeorm';
import { Film } from '../src/repository/film.entity';
import { FilmsRepository } from '../src/repository/films.repository';
import { Schedule } from '../src/repository/schedule.entity';

const filmId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const scheduleId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const otherScheduleId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const databaseUrl = new URL(
  process.env.DATABASE_URL ?? 'postgres://localhost:5432/prac',
);
const dataSource = new DataSource({
  type: 'postgres',
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 5432),
  database: databaseUrl.pathname.slice(1),
  username: String(
    process.env.DATABASE_USERNAME ??
      decodeURIComponent(databaseUrl.username) ??
      'prac',
  ),
  password: String(
    process.env.DATABASE_PASSWORD ??
      decodeURIComponent(databaseUrl.password) ??
      'prac',
  ),
  entities: [Film, Schedule],
  synchronize: false,
});

let repository: FilmsRepository;

describe('FilmsRepository PostgreSQL integration', () => {
  beforeAll(async () => {
    await dataSource.initialize();
    repository = new FilmsRepository(dataSource);
    await dataSource.query(
      `
        INSERT INTO films
          (id, title, rating, director, tags, image, cover, about, description)
        VALUES
          ($1, 'Integration Film', 8.5, 'Test Director', ARRAY['Test'],
           '/test.jpg', '/test-cover.jpg', 'About test', 'Description test')
        ON CONFLICT (id) DO NOTHING
      `,
      [filmId],
    );
    await dataSource.query(
      `
        INSERT INTO schedules
          (id, daytime, hall, rows, seats, price, taken, film_id)
        VALUES
          ($1, '2030-01-01T10:00:00Z', 1, 5, 10, 350, '{}', $3),
          ($2, '2030-01-01T12:00:00Z', 1, 5, 10, 400, '{}', $3)
        ON CONFLICT (id) DO NOTHING
      `,
      [scheduleId, otherScheduleId, filmId],
    );
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM schedules WHERE film_id = $1', [
      filmId,
    ]);
    await dataSource.query('DELETE FROM films WHERE id = $1', [filmId]);
    await dataSource.destroy();
  });

  it('returns films without schedule for the list endpoint contract', async () => {
    const films = await repository.findAll();
    const integrationFilm = films.find((film) => film.id === filmId);

    expect(integrationFilm).toMatchObject({
      id: filmId,
      title: 'Integration Film',
      rating: 8.5,
    });
    expect(integrationFilm).not.toHaveProperty('schedule');
  });

  it('returns a film with its schedule', async () => {
    const film = await repository.findById(filmId);

    expect(film).toMatchObject({ id: filmId, title: 'Integration Film' });
    expect(film?.schedule).toHaveLength(2);
    expect(film?.schedule.map((session) => session.id)).toEqual(
      expect.arrayContaining([scheduleId, otherScheduleId]),
    );
  });

  it('reserves a free seat and persists it in PostgreSQL', async () => {
    const result = await repository.reserveSeats(filmId, scheduleId, ['1:1']);
    const schedule = await dataSource.getRepository(Schedule).findOneBy({
      id: scheduleId,
    });

    expect(
      result?.schedule.find((session) => session.id === scheduleId)?.taken,
    ).toContain('1:1');
    expect(schedule?.taken).toContain('1:1');
  });

  it('rejects a seat that has already been reserved', async () => {
    const result = await repository.reserveSeats(filmId, scheduleId, ['1:1']);

    expect(result).toBeNull();
  });

  it('rejects an unknown session without changing existing reservations', async () => {
    const result = await repository.reserveSeats(
      filmId,
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      ['1:2'],
    );
    const schedule = await dataSource.getRepository(Schedule).findOneBy({
      id: scheduleId,
    });

    expect(result).toBeNull();
    expect(schedule?.taken).toEqual(['1:1']);
  });

  it('rolls back reservations when a transaction fails', async () => {
    await expect(
      repository.withTransaction(async (transactionRepository) => {
        const result = await transactionRepository.reserveSeats(
          filmId,
          otherScheduleId,
          ['2:2'],
        );
        expect(result).not.toBeNull();
        throw new Error('rollback test');
      }),
    ).rejects.toThrow('rollback test');

    const schedule = await dataSource.getRepository(Schedule).findOneBy({
      id: otherScheduleId,
    });
    expect(schedule?.taken).not.toContain('2:2');
  });
});
