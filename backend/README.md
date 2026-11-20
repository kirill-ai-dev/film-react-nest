# Бэкенд FILM!

Nest.js хранит фильмы и сеансы в PostgreSQL через TypeORM. Таблицы `films` и
`schedules` связаны отношением один-ко-многим по полю `film_id`.

## Запуск

Из корня проекта запустите PostgreSQL:

```bash
docker compose up -d postgres
```

Из папки `backend` установите зависимости, скопируйте настройки и запустите API:

```bash
npm ci
cp .env.example .env
npm run start:dev
```

Пример настроек:

```dotenv
PORT=3000
DATABASE_DRIVER=postgres
DATABASE_URL=postgres://localhost:5432/prac
DATABASE_USERNAME=prac
DATABASE_PASSWORD=prac
```

Создание таблиц и учебное наполнение выполняются SQL-файлами:

```bash
docker compose exec -T postgres psql -U prac -d prac < backend/test/prac.init.sql
docker compose exec -T postgres psql -U prac -d prac < backend/test/prac.films.sql
docker compose exec -T postgres psql -U prac -d prac < backend/test/prac.shedules.sql
```

## API

- `GET /api/afisha/films/` — список фильмов без расписания.
- `GET /api/afisha/films/:id/schedule` — расписание фильма; неизвестный фильм возвращает 404.
- `POST /order` и `POST /api/afisha/order` — бронирование билетов.
- `GET /content/afisha/*` — изображения афиши.

Контакты покупателя и непустой массив `tickets` обязательны. Для билета нужны
`film`, `session`, `row` и `seat`; цена и время берутся из базы. Повторная бронь
места и неверные координаты возвращают 400, неизвестный фильм или сеанс — 404.

## Проверки

```bash
npm run lint
npm run build
```

## Устройство хранилища

- `src/repository/film.entity.ts` — сущность фильма.
- `src/repository/schedule.entity.ts` — сущность сеанса и связь с фильмом.
- `src/repository/film.converter.ts` — преобразование сущностей в DTO.
- `src/repository/films.repository.ts` — TypeORM-репозиторий и атомарное бронирование.
- `src/repository/repository.module.ts` — подключение PostgreSQL через ConfigModule.
