import {
  FilmDto,
  FilmWithScheduleDto,
  ScheduleDto,
} from '../films/dto/films.dto';
import { FilmEntity, ScheduleEntity } from './film.schema';

/** Возвращает только поля афиши, без расписания и служебных полей MongoDB. */
export function filmToDto(film: Omit<FilmEntity, 'schedule'>): FilmDto {
  return Object.assign(new FilmDto(), {
    id: film.id,
    title: film.title,
    rating: film.rating,
    director: film.director,
    tags: [...film.tags],
    about: film.about,
    description: film.description,
    image: film.image,
    cover: film.cover,
  });
}

/** Преобразует сеанс из хранилища в DTO и приводит номер зала к строке. */
function scheduleToDto(session: ScheduleEntity): ScheduleDto {
  return Object.assign(new ScheduleDto(), {
    id: session.id,
    daytime: session.daytime,
    hall: String(session.hall),
    rows: session.rows,
    seats: session.seats,
    price: session.price,
    taken: [...session.taken],
  });
}

/** Возвращает DTO фильма вместе с его расписанием. */
export function filmWithScheduleToDto(film: FilmEntity): FilmWithScheduleDto {
  return Object.assign(new FilmWithScheduleDto(), filmToDto(film), {
    schedule: film.schedule.map(scheduleToDto),
  });
}

/** Готовит данные DTO к сохранению, копируя только известные поля. */
export function filmToEntity(film: FilmWithScheduleDto): FilmEntity {
  return {
    ...filmToDto(film),
    schedule: film.schedule.map((session) => ({ ...scheduleToDto(session) })),
  };
}
