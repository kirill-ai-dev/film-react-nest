import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** Сеанс фильма, который хранится внутри документа фильма. */
@Schema({ _id: false, id: false })
export class Schedule {
  /** Уникальный идентификатор сеанса. */
  @Prop({ type: String, required: true })
  id: string;

  /** Дата и время начала сеанса. */
  @Prop({ type: String, required: true })
  daytime: string;

  /** Номер зала. */
  @Prop({ type: Number, required: true, min: 0 })
  hall: number;

  /** Количество рядов. */
  @Prop({ type: Number, required: true, min: 1 })
  rows: number;

  /** Количество мест в каждом ряду. */
  @Prop({ type: Number, required: true, min: 1 })
  seats: number;

  /** Цена билета. */
  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  /** Уже занятые места в формате «ряд:место». */
  @Prop({ type: [String], default: [] })
  taken: string[];
}

/** Схема вложенного сеанса без отдельного MongoDB _id. */
export const ScheduleSchema = SchemaFactory.createForClass(Schedule);

/** Фильм и его расписание в коллекции films. */
@Schema({ collection: 'films', id: false, versionKey: false })
export class Film {
  /** Уникальный идентификатор фильма из API. */
  @Prop({ type: String, required: true, unique: true })
  id: string;

  /** Название фильма. */
  @Prop({ type: String, required: true })
  title: string;

  /** Рейтинг фильма. */
  @Prop({ type: Number, required: true, min: 0, max: 10 })
  rating: number;

  /** Режиссёр фильма. */
  @Prop({ type: String, required: true })
  director: string;

  /** Жанры фильма. */
  @Prop({ type: [String], default: [] })
  tags: string[];

  /** Краткое описание фильма. */
  @Prop({ type: String, required: true })
  about: string;

  /** Полное описание фильма. */
  @Prop({ type: String, required: true })
  description: string;

  /** Имя файла маленькой афиши. */
  @Prop({ type: String, required: true })
  image: string;

  /** Имя файла обложки фильма. */
  @Prop({ type: String, required: true })
  cover: string;

  /** Расписание сеансов фильма. */
  @Prop({ type: [ScheduleSchema], default: [] })
  schedule: Schedule[];
}

/** Схема документа коллекции films. */
export const FilmSchema = SchemaFactory.createForClass(Film);
