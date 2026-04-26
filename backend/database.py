import os
from collections.abc import Generator

import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://zhirovka:zhirovka_password@localhost:5432/zhirovka",
)


def get_connection() -> Generator[psycopg.Connection, None, None]:
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as connection:
        yield connection
