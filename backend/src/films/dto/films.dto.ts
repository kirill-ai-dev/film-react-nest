/** Описание фильма в афише. */
export class FilmDto {
  /** Уникальный идентификатор фильма. */
  id: string;

  /** Название фильма. */
  title: string;

  /** Рейтинг фильма. */
  rating: number;

  /** Режиссёр фильма. */
  director: string;

  /** Жанры фильма. */
  tags: string[];

  /** Краткое описание фильма. */
  about: string;

  /** Полное описание фильма. */
  description: string;

  /** Имя файла с маленьким изображением. */
  image: string;

  /** Имя файла с обложкой фильма. */
  cover: string;
}

/** Список фильмов с общим количеством элементов. */
export class FilmsResponseDto {
  /** Количество фильмов в списке. */
  total: number;

  /** Фильмы в списке. */
  items: FilmDto[];
}

/** Сеанс фильма в расписании. */
export class ScheduleDto {
  /** Уникальный идентификатор сеанса. */
  id: string;

  /** Дата и время начала сеанса. */
  daytime: string;

  /** Номер зала. */
  hall: number;

  /** Количество рядов в зале. */
  rows: number;

  /** Количество мест в ряду. */
  seats: number;

  /** Цена билета. */
  price: number;

  /** Занятые места в формате «ряд:место». */
  taken: string[];
}

/** Список сеансов с общим количеством элементов. */
export class ScheduleResponseDto {
  /** Количество сеансов в списке. */
  total: number;

  /** Сеансы в расписании. */
  items: ScheduleDto[];
}

/** Полные данные фильма для обмена с хранилищем. */
export class FilmWithScheduleDto extends FilmDto {
  /** Сеансы этого фильма. */
  schedule: ScheduleDto[];
}
