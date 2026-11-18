import { NotFoundException } from '@nestjs/common';
import { FilmsService } from './films.service';
import { FilmsRepository } from '../repository/films.repository';

describe('FilmsService', () => {
  const repository = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };
  const service = new FilmsService(repository as unknown as FilmsRepository);

  beforeEach(() => jest.resetAllMocks());

  it('возвращает фильмы из репозитория и их количество', async () => {
    const films = [{ id: 'film-id', title: 'Фильм' }];
    repository.findAll.mockResolvedValue(films);
    await expect(service.getFilms()).resolves.toEqual({
      total: 1,
      items: films,
    });
  });

  it('возвращает пустой список для пустого хранилища', async () => {
    repository.findAll.mockResolvedValue([]);
    await expect(service.getFilms()).resolves.toEqual({ total: 0, items: [] });
  });

  it('возвращает расписание выбранного фильма', async () => {
    const schedule = [{ id: 'session-id', hall: '0' }];
    repository.findById.mockResolvedValue({ id: 'film-id', schedule });
    await expect(service.getSchedule('film-id')).resolves.toEqual({
      total: 1,
      items: schedule,
    });
    expect(repository.findById).toHaveBeenCalledWith('film-id');
  });

  it('возвращает 404, если фильм не найден', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getSchedule('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
