import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FilmWithScheduleDto } from '../films/dto/films.dto';
import { FilmsRepository } from '../repository/films.repository';
import { OrderService } from './order.service';

const film: FilmWithScheduleDto = {
  id: 'film-id',
  title: 'Фильм',
  rating: 8,
  director: 'Режиссёр',
  tags: ['Драма'],
  about: 'Кратко',
  description: 'Описание',
  image: '/bg1s.jpg',
  cover: '/bg1c.jpg',
  schedule: [
    {
      id: 'session-id',
      daytime: '2024-06-28T10:00:53+03:00',
      hall: '0',
      rows: 5,
      seats: 10,
      price: 350,
      taken: ['1:1'],
    },
  ],
};

const ticket = (row: number, seat: number) => ({
  film: film.id,
  session: 'session-id',
  row,
  seat,
  price: 999,
});

describe('OrderService', () => {
  const repository = {
    withTransaction: jest.fn(),
    findById: jest.fn(),
    reserveSeats: jest.fn(),
  };
  const service = new OrderService(repository as unknown as FilmsRepository);

  beforeEach(() => {
    jest.resetAllMocks();
    repository.withTransaction.mockImplementation((work) => work(repository));
    repository.findById.mockResolvedValue(film);
    repository.reserveSeats.mockResolvedValue(film);
  });

  it('занимает места и возвращает актуальные данные сеанса', async () => {
    const result = await service.createOrder({
      email: 'test@example.com',
      phone: '+70000000000',
      tickets: [ticket(2, 3), ticket(2, 4)],
    });
    expect(repository.reserveSeats).toHaveBeenCalledWith(
      film.id,
      'session-id',
      ['2:3', '2:4'],
    );
    expect(result.total).toBe(2);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          film: film.id,
          session: 'session-id',
          row: 2,
          seat: 3,
          daytime: film.schedule[0].daytime,
          price: 350,
        }),
        expect.objectContaining({
          film: film.id,
          session: 'session-id',
          row: 2,
          seat: 4,
          daytime: film.schedule[0].daytime,
          price: 350,
        }),
      ]),
    );
    expect(result.items[0].id).toEqual(expect.any(String));
  });

  it('не отправляет повторяющееся место в репозиторий', async () => {
    await expect(
      service.createOrder({
        email: 'test@example.com',
        phone: '+70000000000',
        tickets: [ticket(2, 3), ticket(2, 3)],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.reserveSeats).not.toHaveBeenCalled();
  });

  it('отклоняет уже занятое место', async () => {
    repository.reserveSeats.mockResolvedValue(null);
    await expect(
      service.createOrder({
        email: 'test@example.com',
        phone: '+70000000000',
        tickets: [ticket(1, 1)],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('отклоняет место за пределами зала', async () => {
    await expect(
      service.createOrder({
        email: 'test@example.com',
        phone: '+70000000000',
        tickets: [ticket(6, 1)],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.reserveSeats).not.toHaveBeenCalled();
  });

  it('возвращает 404 для неизвестного фильма и сеанса', async () => {
    repository.findById.mockResolvedValueOnce(null);
    await expect(
      service.createOrder({ email: 'a', phone: 'b', tickets: [ticket(2, 3)] }),
    ).rejects.toBeInstanceOf(NotFoundException);
    repository.findById.mockResolvedValueOnce({ ...film, schedule: [] });
    await expect(
      service.createOrder({ email: 'a', phone: 'b', tickets: [ticket(2, 3)] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('возвращает пустой результат для пустого заказа', async () => {
    await expect(
      service.createOrder({ email: 'a', phone: 'b', tickets: [] }),
    ).resolves.toEqual({ total: 0, items: [] });
    expect(repository.findById).not.toHaveBeenCalled();
  });
});
