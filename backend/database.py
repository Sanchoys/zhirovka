import os
from collections.abc import Generator

import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://zhirovka:zhirovka_password@localhost:5432/zhirovka",
)

SCHEMA_MIGRATIONS = (
    "ALTER TYPE calc_method ADD VALUE IF NOT EXISTS 'manual'",
    """
    ALTER TABLE services
    ADD COLUMN IF NOT EXISTS include_in_total BOOLEAN NOT NULL DEFAULT TRUE
    """,
    """
    ALTER TABLE readings_and_charges
    ADD COLUMN IF NOT EXISTS include_in_total BOOLEAN NOT NULL DEFAULT TRUE
    """,
)


def get_connection() -> Generator[psycopg.Connection, None, None]:
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as connection:
        yield connection


def ensure_database_schema() -> None:
    with psycopg.connect(DATABASE_URL, autocommit=True) as connection:
        for statement in SCHEMA_MIGRATIONS:
            connection.execute(statement)
