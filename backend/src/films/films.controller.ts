import { Controller, Get, Param } from '@nestjs/common';
import { FilmsService } from './films.service';
import { FilmsResponseDto, ScheduleResponseDto } from './dto/films.dto';

/** Принимает запросы к фильмам и их расписанию. */
@Controller('films')
export class FilmsController {
  constructor(private readonly filmsService: FilmsService) {}

  /** Возвращает список фильмов афиши. */
  @Get()
  getFilms(): Promise<FilmsResponseDto> {
    return this.filmsService.getFilms();
  }

  /** Возвращает расписание фильма по его идентификатору. */
  @Get(':id/schedule')
  getSchedule(@Param('id') id: string): Promise<ScheduleResponseDto> {
    return this.filmsService.getSchedule(id);
  }
}
