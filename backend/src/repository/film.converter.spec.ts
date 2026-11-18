import { model } from 'mongoose';
import { FilmWithScheduleDto } from '../films/dto/films.dto';
import {
  filmToDto,
  filmToEntity,
  filmWithScheduleToDto,
} from './film.converter';
import { filmSchema } from './film.schema';

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
      hall: 0,
      rows: 5,
      seats: 10,
      price: 350,
      taken: ['1:2'],
    },
  ],
};

describe('Конвертер фильма', () => {
  it('сохраняет данные при преобразовании DTO в сущность и обратно', () => {
    expect(filmWithScheduleToDto(filmToEntity(film))).toEqual(film);
  });

  it('не передаёт расписание и служебные поля MongoDB в список афиши', () => {
    const entity = { ...filmToEntity(film), _id: 'mongo-id', __v: 3 };
    const { schedule, ...summary } = film;
    expect(schedule).toHaveLength(1);
    expect(filmToDto(entity)).toEqual(summary);
  });

  it('возвращает числовой номер зала даже из ранее сохранённой строки', () => {
    const entity = filmToEntity(film);
    Object.assign(entity.schedule[0], { hall: '0' });
    expect(filmWithScheduleToDto(entity).schedule[0].hall).toBe(0);
  });

  it('не меняет исходные массивы при изменении результата', () => {
    const result = filmWithScheduleToDto(filmToEntity(film));
    result.tags.push('Комедия');
    result.schedule[0].taken.push('2:3');
    expect(film.tags).toEqual(['Драма']);
    expect(film.schedule[0].taken).toEqual(['1:2']);
  });

  it('создаёт коллекцию films без дополнительных _id у сеансов', () => {
    const Film = model('ConverterFilm', filmSchema);
    const document = new Film(filmToEntity(film));
    expect(document.validateSync()).toBeUndefined();
    expect(Film.collection.name).toBe('films');
    expect(document.id).toBe(film.id);
    expect(document.schedule[0]).not.toHaveProperty('_id');
  });
});
