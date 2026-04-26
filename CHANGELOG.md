# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-04-26

### Changed

- Updated Docker publishing workflow to derive the GHCR image name from the current GitHub repository in lowercase.
- Added README instructions for configuring GitHub Actions package write permissions for GHCR publishing.

## [0.2.0] - 2026-04-26

### Added

- Added GitHub Actions workflow for building and publishing the backend Docker image to GitHub Container Registry.
- Added GHCR image tagging for `latest`, semantic version tags, and short commit SHA tags.
- Added README deployment instructions for pulling the pre-built image from GHCR.

### Changed

- Changed Docker Compose backend service to use `ghcr.io/sanchoys/zhirovka:latest` instead of building locally.
- Updated README infrastructure documentation to describe automated image publishing via GitHub Actions.

## [0.1.0] - 2026-04-26

### Added

- Added initial PostgreSQL schema for objects, services, tariffs, monthly records, and readings/charges.
- Added Docker Compose infrastructure with PostgreSQL and FastAPI backend containers.
- Added FastAPI REST API for objects, services, tariffs, monthly data entry, and dashboard analytics.
- Added Vanilla JS frontend served by FastAPI as static files.
- Added Bootstrap 5, Bootstrap Icons, and Chart.js CDN integrations.
- Added dashboard analytics with monthly summary, service breakdown chart, and 12-month expense trend.
- Added `.env.example` for runtime configuration.
- Added project documentation in `README.md`.
- Added changelog using Keep a Changelog format.

### Changed

- Simplified deployment by removing Nginx and serving frontend static files directly from FastAPI.
- Changed default application port to `5000`.
- Simplified Docker Compose networking to use the default Compose network.
- Simplified environment variables to only include runtime configuration values.
