import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { FilmDto, FilmWithScheduleDto } from '../films/dto/films.dto';
import { filmToDto, filmWithScheduleToDto } from './film.converter';
import { Film } from './film.entity';
import { Schedule } from './schedule.entity';

@Injectable()
export class FilmsRepository {
  private films: Repository<Film>;
  private schedules: Repository<Schedule>;

  private manager?: EntityManager;

  constructor(private readonly dataSource: DataSource) {
    this.films = dataSource.getRepository(Film);
    this.schedules = dataSource.getRepository(Schedule);
  }

  private static forManager(
    dataSource: DataSource,
    manager: EntityManager,
  ): FilmsRepository {
    const repository = new FilmsRepository(dataSource);
    repository.manager = manager;
    repository.films = manager.getRepository(Film);
    repository.schedules = manager.getRepository(Schedule);
    return repository;
  }

  async findAll(): Promise<FilmDto[]> {
    const films = await this.films.find({ order: { id: 'ASC' } });
    return films.map(filmToDto);
  }

  async findById(id: string): Promise<FilmWithScheduleDto | null> {
    const film = await this.films.findOne({
      where: { id },
      relations: { schedule: true },
    });
    return film ? filmWithScheduleToDto(film) : null;
  }

  async reserveSeats(
    filmId: string,
    sessionId: string,
    places: string[],
  ): Promise<FilmWithScheduleDto | null> {
    return this.reserveSessions(filmId, new Map([[sessionId, places]]));
  }

  async reserveSessions(
    filmId: string,
    reservations: ReadonlyMap<string, string[]>,
  ): Promise<FilmWithScheduleDto | null> {
    return this.withManager(async (manager) => {
      const film = await manager
        .getRepository(Film)
        .createQueryBuilder('film')
        .where('film.id = :filmId', { filmId })
        .setLock('pessimistic_write')
        .getOne();
      if (!film) return null;
      const ids = [...reservations.keys()];
      const sessions = await manager
        .getRepository(Schedule)
        .createQueryBuilder('schedule')
        .where('schedule.film_id = :filmId', { filmId })
        .andWhere('schedule.id IN (:...ids)', { ids })
        .setLock('pessimistic_write')
        .getMany();
      if (sessions.length !== ids.length) return null;
      for (const session of sessions) {
        const places = reservations.get(session.id) ?? [];
        if (places.some((place) => session.taken.includes(place))) return null;
        session.taken = [...session.taken, ...places];
      }
      await manager.getRepository(Schedule).save(sessions);
      film.schedule = sessions;
      return filmWithScheduleToDto(film);
    });
  }

  async withTransaction<T>(
    work: (repository: FilmsRepository) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) =>
      work(FilmsRepository.forManager(this.dataSource, manager)),
    );
  }

  async save(film: FilmWithScheduleDto): Promise<FilmWithScheduleDto> {
    const entity = this.films.create({
      id: film.id,
      title: film.title,
      rating: film.rating,
      director: film.director,
      tags: [...film.tags],
      about: film.about,
      description: film.description,
      image: film.image,
      cover: film.cover,
      schedule: film.schedule.map((item) => ({ ...item, film_id: film.id })),
    });
    const saved = await this.films.save(entity);
    return filmWithScheduleToDto(saved);
  }

  private async withManager<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    if (this.manager) return work(this.manager);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const result = await work(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
