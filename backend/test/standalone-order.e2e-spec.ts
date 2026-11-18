import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { FilmWithScheduleDto } from '../src/films/dto/films.dto';
import { FilmsRepository } from '../src/repository/films.repository';

/** Запускается отдельно с TEST_STANDALONE_DATABASE_URL на обычной MongoDB. */
describe('Бронирование на standalone MongoDB', () => {
  let app: INestApplication;
  let connection: Connection;
  let repository: FilmsRepository;
  const film: FilmWithScheduleDto = JSON.parse(
    readFileSync(join(__dirname, 'mongodb_initial_stub.json'), 'utf8'),
  )[0];
  const ticket = (session: string, seat = 1) => ({
    film: film.id,
    session,
    row: 1,
    seat,
  });
  const order = (tickets: ReturnType<typeof ticket>[]) => ({
    email: 'test@example.com',
    phone: '+70000000000',
    tickets,
  });

  beforeAll(async () => {
    const previousUrl = process.env.DATABASE_URL;
    const testUrl = new URL(
      process.env.TEST_STANDALONE_DATABASE_URL ??
        process.env.TEST_DATABASE_URL ??
        'mongodb://127.0.0.1:27017',
    );
    testUrl.pathname = `/film_standalone_test_${randomUUID().replace(/-/g, '')}`;
    process.env.DATABASE_URL = testUrl.toString();
    try {
      app = await NestFactory.create(AppModule, { logger: false });
      await app.init();
      connection = app.get<Connection>('DATABASE_CONNECTION');
      repository = app.get(FilmsRepository);
    } finally {
      if (previousUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousUrl;
    }
  });

  beforeEach(async () => {
    await connection.collection('films').deleteMany({});
    await repository.save(film);
  });

  afterAll(async () => {
    if (connection) await connection.dropDatabase();
    if (app) await app.close();
  });

  it('бронирует несколько сеансов одного фильма одним заказом', async () => {
    await request(app.getHttpServer())
      .post('/order')
      .send(order([ticket(film.schedule[0].id), ticket(film.schedule[1].id)]))
      .expect(200);
    const stored = await repository.findById(film.id);
    expect(stored.schedule.slice(0, 2).map((session) => session.taken)).toEqual(
      [['1:1'], ['1:1']],
    );
  });

  it('не занимает место первого сеанса при конфликте во втором', async () => {
    await repository.reserveSeats(film.id, film.schedule[1].id, ['1:1']);
    await request(app.getHttpServer())
      .post('/order')
      .send(order([ticket(film.schedule[0].id), ticket(film.schedule[1].id)]))
      .expect(400);
    const stored = await repository.findById(film.id);
    expect(stored.schedule.slice(0, 2).map((session) => session.taken)).toEqual(
      [[], ['1:1']],
    );
  });

  it('отклоняет повторную бронь и сохраняет место ровно один раз', async () => {
    const payload = order([ticket(film.schedule[0].id)]);
    await request(app.getHttpServer()).post('/order').send(payload).expect(200);
    await request(app.getHttpServer()).post('/order').send(payload).expect(400);
    expect((await repository.findById(film.id)).schedule[0].taken).toEqual([
      '1:1',
    ]);
  });

  it('при параллельной брони одного места принимает только один заказ', async () => {
    const payload = order([ticket(film.schedule[0].id)]);
    const responses = await Promise.all([
      request(app.getHttpServer()).post('/order').send(payload),
      request(app.getHttpServer()).post('/order').send(payload),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 400,
    ]);
    expect((await repository.findById(film.id)).schedule[0].taken).toEqual([
      '1:1',
    ]);
  });

  it('не меняет первый сеанс, если другой сеанс заказа отсутствует', async () => {
    await request(app.getHttpServer())
      .post('/order')
      .send(order([ticket(film.schedule[0].id), ticket('missing-session')]))
      .expect(404);
    expect((await repository.findById(film.id)).schedule[0].taken).toEqual([]);
  });

  it('на standalone отклоняет заказ разных фильмов до записи, а на replica set принимает', async () => {
    const second = { ...film, id: 'second-film' };
    await repository.save(second);
    const topology = await connection.db.admin().command({ hello: 1 });
    const transactional = Boolean(
      topology.setName || topology.msg === 'isdbgrid',
    );
    const response = await request(app.getHttpServer())
      .post('/order')
      .send(
        order([
          ticket(film.schedule[0].id),
          { ...ticket(film.schedule[0].id), film: second.id },
        ]),
      )
      .expect(transactional ? 200 : 503);
    if (!transactional) expect(response.body.error).toContain('replica set');
    for (const id of [film.id, second.id]) {
      expect((await repository.findById(id)).schedule[0].taken).toEqual(
        transactional ? ['1:1'] : [],
      );
    }
  });
});
