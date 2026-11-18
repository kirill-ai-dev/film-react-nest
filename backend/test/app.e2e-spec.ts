import { randomUUID } from 'node:crypto';
import { Connection } from 'mongoose';
import { FilmWithScheduleDto } from '../src/films/dto/films.dto';
import { FilmsRepository } from '../src/repository/films.repository';
import { INestApplication, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Film API (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let repository: FilmsRepository;
  const film: FilmWithScheduleDto = JSON.parse(
    readFileSync(join(__dirname, 'mongodb_initial_stub.json'), 'utf8'),
  )[0];

  beforeAll(async () => {
    const previousUrl = process.env.DATABASE_URL;
    const previousDriver = process.env.DATABASE_DRIVER;
    const testUrl = new URL(
      process.env.TEST_DATABASE_URL ?? 'mongodb://127.0.0.1:27017',
    );
    testUrl.pathname = `/film_api_test_${randomUUID().replace(/-/g, '')}`;
    process.env.DATABASE_URL = testUrl.toString();
    process.env.DATABASE_DRIVER = 'mongodb';
    try {
      app = await NestFactory.create(AppModule, { logger: false });
      app.setGlobalPrefix('api/afisha', {
        exclude: [
          { path: 'order', method: RequestMethod.POST },
          { path: 'api/afisha/order', method: RequestMethod.POST },
        ],
      });
      await app.init();
      connection = app.get<Connection>('DATABASE_CONNECTION');
      repository = app.get(FilmsRepository);
    } finally {
      if (previousUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousUrl;
      if (previousDriver === undefined) delete process.env.DATABASE_DRIVER;
      else process.env.DATABASE_DRIVER = previousDriver;
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

  it('возвращает фильмы из MongoDB без расписания и служебных полей', () => {
    return request(app.getHttpServer())
      .get('/api/afisha/films/')
      .expect(200)
      .expect(({ body }) => {
        const { schedule, ...summary } = film;
        expect(schedule).toHaveLength(9);
        expect(body).toEqual({ total: 1, items: [summary] });
      });
  });

  it('возвращает вложенное расписание фильма из MongoDB', () => {
    return request(app.getHttpServer())
      .get(`/api/afisha/films/${film.id}/schedule`)
      .expect(200)
      .expect({
        total: film.schedule.length,
        items: film.schedule.map((session) => ({
          ...session,
          hall: Number(session.hall),
        })),
      });
  });

  it('возвращает 404 для неизвестного фильма', () => {
    return request(app.getHttpServer())
      .get('/api/afisha/films/missing/schedule')
      .expect(404);
  });

  it('возвращает пустой список для пустой коллекции', async () => {
    await connection.collection('films').deleteMany({});
    await request(app.getHttpServer())
      .get('/api/afisha/films/')
      .expect(200)
      .expect({ total: 0, items: [] });
  });

  it('бронирует места и возвращает подтверждённые билеты', async () => {
    const firstSession = film.schedule[0];
    await request(app.getHttpServer())
      .post('/api/afisha/order')
      .send({
        email: 'test@example.com',
        phone: '+7 (000) 000-00-00',
        tickets: [
          {
            film: film.id,
            session: firstSession.id,
            row: 2,
            seat: 3,
            price: 1,
          },
          {
            film: film.id,
            session: firstSession.id,
            row: 2,
            seat: 4,
            price: 1,
          },
        ],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBe(2);
        expect(body.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              film: film.id,
              session: firstSession.id,
              row: 2,
              seat: 3,
              price: firstSession.price,
            }),
            expect.objectContaining({
              film: film.id,
              session: firstSession.id,
              row: 2,
              seat: 4,
              price: firstSession.price,
            }),
          ]),
        );
      });
    const schedule = await request(app.getHttpServer())
      .get(`/api/afisha/films/${film.id}/schedule`)
      .expect(200);
    expect(schedule.body.items[0].taken).toEqual(['2:3', '2:4']);
  });

  it('не позволяет занять уже занятое место дважды', async () => {
    const firstSession = film.schedule[0];
    const payload = {
      email: 'test@example.com',
      phone: '+7 (000) 000-00-00',
      tickets: [
        {
          film: film.id,
          session: firstSession.id,
          row: 2,
          seat: 3,
          price: firstSession.price,
        },
      ],
    };
    await request(app.getHttpServer()).post('/order').send(payload).expect(200);
    await request(app.getHttpServer()).post('/order').send(payload).expect(400);
    const schedule = await request(app.getHttpServer())
      .get(`/api/afisha/films/${film.id}/schedule`)
      .expect(200);
    expect(schedule.body.items[0].taken).toEqual(['2:3']);
  });

  it('отклоняет дубликат места внутри одного заказа', async () => {
    const session = film.schedule[0];
    await request(app.getHttpServer())
      .post('/order')
      .send({
        email: 'test@example.com',
        phone: '+7 (000) 000-00-00',
        tickets: [
          {
            film: film.id,
            session: session.id,
            row: 2,
            seat: 3,
            price: session.price,
          },
          {
            film: film.id,
            session: session.id,
            row: 2,
            seat: 3,
            price: session.price,
          },
        ],
      })
      .expect(400);
  });

  it('при параллельных заказах одно кресло получает только один покупатель', async () => {
    const payload = {
      email: 'test@example.com',
      phone: '+70000000000',
      tickets: [
        { film: film.id, session: film.schedule[0].id, row: 3, seat: 3 },
      ],
    };
    const responses = await Promise.all([
      request(app.getHttpServer()).post('/order').send(payload),
      request(app.getHttpServer()).post('/order').send(payload),
    ]);
    expect(responses.map((item) => item.status).sort()).toEqual([200, 400]);
    expect((await repository.findById(film.id)).schedule[0].taken).toEqual([
      '3:3',
    ]);
  });

  it('не занимает свободное место, если другое место того же заказа уже занято', async () => {
    await repository.reserveSeats(film.id, film.schedule[0].id, ['2:4']);
    await request(app.getHttpServer())
      .post('/order')
      .send({
        email: 'test@example.com',
        phone: '+70000000000',
        tickets: [
          { film: film.id, session: film.schedule[0].id, row: 2, seat: 3 },
          { film: film.id, session: film.schedule[0].id, row: 2, seat: 4 },
        ],
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error).toContain('заняты');
      });
    expect((await repository.findById(film.id)).schedule[0].taken).toEqual([
      '2:4',
    ]);
  });

  it('бронирует одинаковые номера мест разных фильмов и сеансов', async () => {
    const second = { ...film, id: 'second-film' };
    await repository.save(second);
    const tickets = [
      { film: film.id, session: film.schedule[0].id, row: 2, seat: 3 },
      { film: film.id, session: film.schedule[1].id, row: 2, seat: 3 },
      { film: second.id, session: second.schedule[0].id, row: 2, seat: 3 },
    ];
    const result = await request(app.getHttpServer())
      .post('/order')
      .send({
        email: 'test@example.com',
        phone: '+70000000000',
        tickets,
      })
      .expect(200);
    expect(
      result.body.items.map(({ film, session, row, seat }) => ({
        film,
        session,
        row,
        seat,
      })),
    ).toEqual(tickets);
    expect(new Set(result.body.items.map((item) => item.id)).size).toBe(3);
    expect(
      (await repository.findById(film.id)).schedule
        .slice(0, 2)
        .map((item) => item.taken),
    ).toEqual([['2:3'], ['2:3']]);
    expect((await repository.findById(second.id)).schedule[0].taken).toEqual([
      '2:3',
    ]);
  });

  it('откатывает весь заказ, если место другого фильма уже занято', async () => {
    const second = { ...film, id: 'second-film' };
    await repository.save(second);
    await repository.reserveSeats(second.id, second.schedule[0].id, ['2:3']);
    await request(app.getHttpServer())
      .post('/order')
      .send({
        email: 'test@example.com',
        phone: '+70000000000',
        tickets: [
          { film: film.id, session: film.schedule[0].id, row: 2, seat: 3 },
          { film: second.id, session: second.schedule[0].id, row: 2, seat: 3 },
        ],
      })
      .expect(400);
    expect((await repository.findById(film.id)).schedule[0].taken).toEqual([]);
    expect((await repository.findById(second.id)).schedule[0].taken).toEqual([
      '2:3',
    ]);
  });

  it.each([
    { row: 0, seat: 1 },
    { row: -1, seat: 1 },
    { row: 1.5, seat: 1 },
    { row: 1, seat: 0 },
    { row: 1, seat: -1 },
    { row: 1, seat: 1.5 },
    { row: 1, seat: '2' },
    { row: 6, seat: 1 },
    { row: 1, seat: 11 },
    { film: { $ne: null }, row: 1, seat: 1 },
    { session: { $ne: null }, row: 1, seat: 1 },
  ])('отклоняет неверные данные места %j', async (fields) => {
    await request(app.getHttpServer())
      .post('/order')
      .send({
        email: 'test@example.com',
        phone: '+70000000000',
        tickets: [{ film: film.id, session: film.schedule[0].id, ...fields }],
      })
      .expect(400);
    expect((await repository.findById(film.id)).schedule[0].taken).toEqual([]);
  });

  it.each([
    {},
    { email: 'a', phone: 'b', tickets: 'bad' },
    { email: 'a', phone: 'b', tickets: [null] },
    { email: '', phone: 'b', tickets: [] },
    { email: 'a', phone: '', tickets: [] },
  ])('отклоняет неверный заказ %j', async (payload) => {
    await request(app.getHttpServer()).post('/order').send(payload).expect(400);
  });

  it.each([{ film: 'missing' }, { session: 'missing' }])(
    'возвращает 404 при отсутствии фильма или сеанса %j',
    async (fields) => {
      await request(app.getHttpServer())
        .post('/order')
        .send({
          email: 'test@example.com',
          phone: '+70000000000',
          tickets: [
            {
              film: film.id,
              session: film.schedule[0].id,
              row: 1,
              seat: 1,
              ...fields,
            },
          ],
        })
        .expect(404);
    },
  );

  it('принимает крайнее допустимое место зала', async () => {
    await request(app.getHttpServer())
      .post('/order')
      .send({
        email: 'test@example.com',
        phone: '+70000000000',
        tickets: [
          { film: film.id, session: film.schedule[0].id, row: 5, seat: 10 },
        ],
      })
      .expect(200);
    expect((await repository.findById(film.id)).schedule[0].taken).toEqual([
      '5:10',
    ]);
  });
  it('раздаёт изображения из public/content/afisha', () => {
    return request(app.getHttpServer())
      .get('/content/afisha/bg1s.jpg')
      .expect(200)
      .expect('Content-Type', /image\/jpeg/)
      .expect(({ body }) => {
        const image = readFileSync(
          join(__dirname, '..', 'public', 'content', 'afisha', 'bg1s.jpg'),
        );
        expect(body).toEqual(image);
      });
  });

  it('возвращает 404 для отсутствующего изображения', () => {
    return request(app.getHttpServer())
      .get('/content/afisha/missing.jpg')
      .expect(404);
  });

  it('не раздаёт файлы за пределами папки статики', () => {
    return request(app.getHttpServer())
      .get('/content/afisha/..%2F..%2F..%2Fpackage.json')
      .expect(404);
  });
});
