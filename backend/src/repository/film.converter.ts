import {
  FilmDto,
  FilmWithScheduleDto,
  ScheduleDto,
} from '../films/dto/films.dto';
import { Film } from './film.entity';
import { Schedule } from './schedule.entity';

export function filmToDto(film: Film): FilmDto {
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

function scheduleToDto(session: Schedule): ScheduleDto {
  return Object.assign(new ScheduleDto(), {
    id: session.id,
    daytime: new Date(session.daytime).toISOString(),
    hall: Number(session.hall),
    rows: session.rows,
    seats: session.seats,
    price: session.price,
    taken: [...(session.taken ?? [])],
  });
}

export function filmWithScheduleToDto(film: Film): FilmWithScheduleDto {
  return Object.assign(new FilmWithScheduleDto(), filmToDto(film), {
    schedule: (film.schedule ?? []).map(scheduleToDto),
  });
}
