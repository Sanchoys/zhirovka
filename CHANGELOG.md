# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
