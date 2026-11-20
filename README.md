# FILM!

Учебный сервис бронирования билетов в кино. Фронтенд написан на React и Vite,
бэкенд — на Nest.js. Фильмы, расписание и занятые места хранятся в PostgreSQL;
доступ к данным выполняется через TypeORM и отдельный репозиторий.

## Локальный запуск

Понадобятся Node.js, npm и Docker Compose. Команды выполняются из корня проекта,
если не указана другая папка. Если файлы `.env` или `.env.local` уже существуют,
сохраните свои настройки вместо повторного копирования примеров.

### PostgreSQL

```bash
docker compose up -d postgres
docker compose ps
```

База доступна на `127.0.0.1:5432`, данные сохраняются в Docker volume.

### Бэкенд

```bash
cd backend
npm ci
cp .env.example .env
npm run start:dev
```

Перед запуском API создайте таблицы и загрузите учебные данные:

```bash
docker compose exec -T postgres psql -U prac -d prac < backend/test/prac.init.sql
docker compose exec -T postgres psql -U prac -d prac < backend/test/prac.films.sql
docker compose exec -T postgres psql -U prac -d prac < backend/test/prac.shedules.sql
```

Сервер запускается на `http://localhost:3000`. Параметры подключения описаны в
`backend/.env.example`.

Основной способ установки — `npm ci` с `package-lock.json`. Для Yarn Classic также
поддерживается `yarn install --frozen-lockfile` с `yarn.lock`.

Параметры API и устройство бронирования описаны в
[документации бэкенда](backend/README.md).

### Фронтенд

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Для локального бэкенда используйте:

```dotenv
VITE_API_URL=http://localhost:3000/api/afisha
VITE_CDN_URL=http://localhost:3000/content/afisha
```

## Проверки

В папке `backend`:

```bash
npm run lint
npm run build
npm test -- --runInBand
```

В папке `frontend`:

```bash
npm run lint
npm run build
```

Описание API находится в `film.yml`. Для ручной проверки запросов можно
импортировать `film.postman.json` в Postman.
