CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.films
(
    id uuid PRIMARY KEY,
    rating double precision NOT NULL,
    director varchar NOT NULL,
    tags text[] NOT NULL DEFAULT '{}',
    image varchar NOT NULL,
    cover varchar NOT NULL,
    title varchar NOT NULL,
    about varchar NOT NULL,
    description varchar NOT NULL,
    CONSTRAINT films_rating_check CHECK (rating >= 0 AND rating <= 10)
);

CREATE TABLE IF NOT EXISTS public.schedules
(
    id uuid PRIMARY KEY,
    daytime timestamptz NOT NULL,
    hall integer NOT NULL,
    rows integer NOT NULL,
    seats integer NOT NULL,
    price double precision NOT NULL,
    taken text[] NOT NULL DEFAULT '{}',
    film_id uuid NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
    CONSTRAINT schedules_hall_check CHECK (hall >= 0),
    CONSTRAINT schedules_rows_check CHECK (rows > 0),
    CONSTRAINT schedules_seats_check CHECK (seats > 0),
    CONSTRAINT schedules_price_check CHECK (price >= 0)
);
