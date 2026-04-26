# ZhirovKA

ZhirovKA (`zhirovka`) is a utility bill and property expenses management system for a single administrator.

The application tracks properties, utility services, historical tariffs, monthly meter readings, calculated charges, and dashboard analytics.

Supported tariff calculation methods:

- `per_unit`: by metered consumption
- `per_area`: by property area
- `per_person`: by resident count
- `fixed`: fixed monthly amount
- `manual`: monthly amount entered manually from an invoice

Services can be marked as included or excluded from monthly totals. This allows storing meter readings, such as hot and cold water, without double-counting them when they are already included in a separate manual invoice such as rent or a utility bill.

## Tech Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript with ES modules
- UI: Bootstrap 5 and Bootstrap Icons via CDN
- Charts: Chart.js via CDN
- Backend: Python 3.12, FastAPI, Uvicorn
- Database: PostgreSQL
- Infrastructure: Docker Compose with alpine-based images and GHCR image publishing

## Architecture

The project currently runs two containers:

- `db`: PostgreSQL using `postgres:16-alpine`
- `backend`: FastAPI image from `ghcr.io/sanchoys/zhirovka:latest`

Both containers define Docker healthchecks. The backend healthcheck calls `/api/health`, which verifies that FastAPI is running and PostgreSQL is reachable.

FastAPI serves both:

- REST API under `/api/...`
- static frontend files from `/`

Nginx is not used.

Docker images for the backend are built automatically by GitHub Actions and published to GitHub Container Registry.

## GitHub Actions Package Permissions

The Docker publishing workflow uses the built-in `GITHUB_TOKEN` to push images to GHCR.

Repository settings must allow this token to write packages:

1. Open the repository on GitHub.
2. Go to `Settings` -> `Actions` -> `General`.
3. In `Workflow permissions`, select `Read and write permissions`.
4. Save the setting.

If the GHCR package already exists and was created outside this repository, also grant repository access to the package:

1. Open `https://github.com/users/Sanchoys/packages/container/package/zhirovka`.
2. Go to `Package settings`.
3. In `Manage Actions access`, add the `Sanchoys/zhirovka` repository.
4. Grant write access.

## Project Structure

```text
.
├── backend/
│   ├── Dockerfile
│   ├── main.py
│   ├── database.py
│   ├── requirements.txt
│   └── routers/
├── db/
│   └── init.sql
├── frontend/
│   ├── index.html
│   └── assets/
├── docker-compose.yml
├── .env.example
├── README.md
└── CHANGELOG.md
```

## Configuration

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

Default variables:

```env
POSTGRES_DB=zhirovka
POSTGRES_USER=zhirovka
POSTGRES_PASSWORD=change_me
POSTGRES_HOST=db
POSTGRES_PORT=5432

APP_HOST_PORT=5000
```

Use a real database password in `.env`. The `.env` file is ignored by git.

## Deployment

The backend Docker image is built automatically by GitHub Actions on:

- pushes to `main` or `master`
- version tags matching `v*.*.*`

The image is published to:

```text
ghcr.io/sanchoys/zhirovka
```

Image tags include:

- `latest` for the default branch
- the semantic version tag, for example `v0.2.0`
- the short commit SHA

## Run With Docker Compose

1. Create a local `.env` file:

```bash
cp .env.example .env
```

2. Pull the pre-built backend image from GHCR:

```bash
docker compose pull
```

3. Start the application:

```bash
docker compose up
```

4. Open the application:

```text
http://localhost:5000/
```

5. Check backend health:

```text
http://localhost:5000/api/health
```

## Useful Commands

Start in detached mode:

```bash
docker compose up -d
```

Stop containers:

```bash
docker compose down
```

Stop containers and remove the PostgreSQL volume:

```bash
docker compose down -v
```

Validate Compose configuration:

```bash
docker compose config
```

Pull the latest published image:

```bash
docker compose pull
```

## API Base Path

All REST API endpoints are served under:

```text
/api
```

Examples:

```text
/api/objects
/api/services
/api/tariffs
/api/monthly-records
/api/dashboard/summary
```
