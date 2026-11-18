import { Inject, Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { ClientSession, Model } from 'mongoose';
import { FilmDto, FilmWithScheduleDto } from '../films/dto/films.dto';
import {
  filmToDto,
  filmToEntity,
  filmWithScheduleToDto,
} from './film.converter';
import { FilmEntity } from './film.schema';

/** Работает с коллекцией films и скрывает детали MongoDB от сервисов. */
@Injectable()
export class FilmsRepository {
  /** Каждая цепочка запросов видит только свою сессию транзакции. */
  private readonly sessions = new AsyncLocalStorage<ClientSession>();

  constructor(
    @Inject('FILM_MODEL') private readonly filmModel: Model<FilmEntity>,
  ) {}

  /** Возвращает фильмы для афиши, не загружая вложенное расписание. */
  async findAll(): Promise<FilmDto[]> {
    const films = await this.filmModel
      .find()
      .session(this.sessions.getStore() ?? null)
      .select('-schedule')
      .lean()
      .exec();
    return films.map(filmToDto);
  }

  /** Ищет фильм по строковому id из API, а не по MongoDB _id. */
  async findById(id: string): Promise<FilmWithScheduleDto | null> {
    const film = await this.filmModel
      .findOne({ id: { $eq: id } })
      .session(this.sessions.getStore() ?? null)
      .lean()
      .exec();
    return film ? filmWithScheduleToDto(film) : null;
  }

  /**
   * Проверяет все места и занимает их одним запросом в выбранном сеансе.
   * Возвращает null, если сеанс не найден или хотя бы одно место уже занято.
   */
  async reserveSeats(
    filmId: string,
    sessionId: string,
    places: string[],
  ): Promise<FilmWithScheduleDto | null> {
    const film = await this.filmModel
      .findOneAndUpdate(
        {
          id: { $eq: filmId },
          schedule: {
            $elemMatch: { id: { $eq: sessionId }, taken: { $nin: places } },
          },
        },
        { $addToSet: { 'schedule.$.taken': { $each: places } } },
        { new: true, session: this.sessions.getStore(), runValidators: true },
      )
      .lean()
      .exec();
    return film ? filmWithScheduleToDto(film) : null;
  }

  /** Фиксирует все изменения заказа вместе или отменяет их при ошибке. */
  async withTransaction<T>(
    work: (repository: FilmsRepository) => Promise<T>,
  ): Promise<T> {
    const session = await this.filmModel.db.startSession();
    try {
      return await session.withTransaction(() =>
        this.sessions.run(session, () => work(this)),
      );
    } finally {
      await session.endSession();
    }
  }

  /** Сохраняет фильм вместе с расписанием; существующий фильм обновляется. */
  async save(film: FilmWithScheduleDto): Promise<FilmWithScheduleDto> {
    const entity = filmToEntity(film);
    await new this.filmModel(entity).validate();
    const saved = await this.filmModel
      .findOneAndUpdate(
        { id: { $eq: entity.id } },
        { $set: entity },
        {
          upsert: true,
          new: true,
          runValidators: true,
          session: this.sessions.getStore(),
        },
      )
      .lean()
      .exec();
    return filmWithScheduleToDto(saved);
  }
}
