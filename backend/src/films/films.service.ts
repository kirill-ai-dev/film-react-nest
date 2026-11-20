import { Injectable, NotFoundException } from '@nestjs/common';
import { FilmsResponseDto, ScheduleResponseDto } from './dto/films.dto';
import { FilmsRepository } from '../repository/films.repository';

/** Сервис с операциями афиши фильмов. */
@Injectable()
export class FilmsService {
  constructor(private readonly filmsRepository: FilmsRepository) {}

  /** Получает фильмы из хранилища и подсчитывает их количество. */
  async getFilms(): Promise<FilmsResponseDto> {
    const items = await this.filmsRepository.findAll();
    return { total: items.length, items };
  }

  /**
   * Возвращает расписание выбранного фильма.
   * @param filmId Строковый идентификатор фильма из афиши.
   */
  async getSchedule(filmId: string): Promise<ScheduleResponseDto> {
    const film = await this.filmsRepository.findById(filmId);
    if (!film) {
      throw new NotFoundException('Фильм не найден');
    }
    return { total: film.schedule.length, items: film.schedule };
  }
}
