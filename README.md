# FILM!

Учебный сервис бронирования билетов в кино. Фронтенд написан на React и Vite,
бэкенд — на Nest.js. Фильмы, расписание и занятые места хранятся в MongoDB;
доступ к данным выполняется через Mongoose и отдельный репозиторий.

## Локальный запуск

Понадобятся Node.js, npm и Docker Compose. Команды выполняются из корня проекта,
если не указана другая папка. Если файлы `.env` или `.env.local` уже существуют,
сохраните свои настройки вместо повторного копирования примеров.

### MongoDB

```bash
docker compose up -d mongodb
docker compose ps
```

Перед запуском бэкенда дождитесь статуса `healthy`. База доступна на
`127.0.0.1:27017`; Docker volume сохраняет данные после остановки контейнера.
Replica set `rs0` инициализируется автоматически и позволяет оформлять заказ
с билетами на разные фильмы в одной транзакции.

### Бэкенд

В отдельном терминале:

```bash
cd backend
npm ci
cp .env.example .env
npm run db:seed
npm run start:dev
```

Сервер запускается на `http://localhost:3000`. Импорт использует
`backend/test/mongodb_initial_stub.json`; существующие фильмы и занятые места
сохраняются. Для запуска с отладчиком используйте `npm run start:debug`.

Основной способ установки — `npm ci` с `package-lock.json`, он же используется
в GitHub Actions. Для Yarn Classic также поддерживается
`yarn install --frozen-lockfile` с `yarn.lock`. Выберите один способ установки.

Параметры подключения, API и устройство бронирования описаны в
[документации бэкенда](backend/README.md).

### Фронтенд

В другом терминале:

```bash
cd frontend
npm ci
cp .env.example .env.local
```

Для локального бэкенда укажите в `frontend/.env.local`:

```dotenv
VITE_API_URL=http://localhost:3000/api/afisha
VITE_CDN_URL=http://localhost:3000/content/afisha
```

Затем выполните `npm run dev` и откройте адрес, который выведет Vite
(обычно `http://localhost:5173`). После изменения `.env.local` перезапустите Vite.

## Проверки

В папке `backend`, с запущенной MongoDB:

```bash
npm run lint
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

В папке `frontend`:

```bash
npm run lint
npm run build
```

Описание API находится в `film.yml`. Для ручной проверки запросов можно
импортировать `film.postman.json` в Postman.
