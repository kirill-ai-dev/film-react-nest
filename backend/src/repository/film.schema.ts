import { Schema } from 'mongoose';

/** Данные сеанса внутри документа фильма в MongoDB. */
export interface ScheduleEntity {
  id: string;
  daytime: string;
  hall: number;
  rows: number;
  seats: number;
  price: number;
  taken: string[];
}

/** Поля документа фильма, без служебных полей MongoDB. */
export interface FilmEntity {
  id: string;
  title: string;
  rating: number;
  director: string;
  tags: string[];
  about: string;
  description: string;
  image: string;
  cover: string;
  schedule: ScheduleEntity[];
}

/** Сеансу достаточно своего строкового id, дополнительный _id не нужен. */
const scheduleSchema = new Schema<ScheduleEntity>(
  {
    id: { type: String, required: true },
    daytime: { type: String, required: true },
    hall: { type: Number, required: true, min: 0 },
    rows: { type: Number, required: true, min: 1 },
    seats: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    taken: { type: [String], default: [] },
  },
  { _id: false, id: false },
);

/** Фильм хранится вместе со всем расписанием в коллекции films. */
export const filmSchema = new Schema<FilmEntity>(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    rating: { type: Number, required: true, min: 0, max: 10 },
    director: { type: String, required: true },
    tags: { type: [String], default: [] },
    about: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    cover: { type: String, required: true },
    schedule: { type: [scheduleSchema], default: [] },
  },
  { collection: 'films', id: false, versionKey: false },
);
