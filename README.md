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

## Деплой через Docker Compose

Для production-сборки скопируйте пример переменных и задайте свои значения:

```bash
cp .env.example .env
docker compose -f docker-compose.yml up -d --build
```

После запуска:

- приложение: `http://127.0.0.1/` (локальный Compose-порт `80`);
- API: `http://127.0.0.1/api/afisha/films/`;
- pgAdmin: `http://127.0.0.1:8080/` (только через SSH-туннель).

Для production используется отдельный `docker-compose.prod.yml`: frontend доступен только на `127.0.0.1:8181`, потому что внешний Nginx уже занимает публичный порт `80` и проксирует домен `kirill-test-practic.ru` в контейнер. Это сделано, чтобы не затрагивать другие сайты на сервере.

Образы и Nginx на удалённом сервере используют отдельный vhost `kirill-test-practic.ru`.

Перед первым запуском заполните PostgreSQL SQL-скриптами из `backend/test`:

```bash
docker compose -f docker-compose.yml exec -T database psql -U prac -d prac < backend/test/prac.init.sql
docker compose -f docker-compose.yml exec -T database psql -U prac -d prac < backend/test/prac.films.sql
docker compose -f docker-compose.yml exec -T database psql -U prac -d prac < backend/test/prac.shedules.sql
```

Образы публикуются GitHub Actions в GitHub Container Registry после push в `main`.

Для production обновление может выполняться workflow `Deploy production` после успешного workflow публикации образов. Для этого в настройках репозитория должны быть заданы Secrets `PRODUCTION_HOST`, `PRODUCTION_USER` и `PRODUCTION_SSH_KEY`. Workflow использует `docker-compose.prod.yml`, не открывает frontend напрямую наружу и обновляет только backend/frontend-контейнеры.

PM2 намеренно не используется: контейнерный backend запускается одним production-процессом, Docker собирает stdout/stderr, а структурированные JSON-логи доступны через `docker compose logs`.

## Развёрнутый учебный проект

- Приложение: http://kirill-test-practic.ru/
- HTTPS будет включён после перевода DNS-записей `kirill-test-practic.ru` и `www.kirill-test-practic.ru` в режим DNS-only для выпуска сертификата Let's Encrypt.
- Индексация закрыта через `robots.txt`, HTML meta-теги и заголовок `X-Robots-Tag`.
- Сервис развёрнут в отдельном каталоге `/opt/film-react-nest`, Compose-проекте `film-react-nest` и loopback-порту `127.0.0.1:8181`; существующие сайты используют свои vhost и не разделяют его контейнеры или volumes.

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
