from datetime import date
from typing import Annotated

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Response, status

from database import get_connection
from schemas import TariffCreate, TariffRead, TariffUpdate

router = APIRouter()
ConnectionDependency = Annotated[psycopg.Connection, Depends(get_connection)]

TARIFF_SELECT = """
    SELECT t.id, t.service_id, s.name AS service_name, s.unit AS service_unit,
           t.price, t.calc_method, t.valid_from, t.created_at, t.updated_at
    FROM tariffs t
    JOIN services s ON s.id = t.service_id
"""


@router.get("", response_model=list[TariffRead])
def list_tariffs(connection: ConnectionDependency):
    rows = connection.execute(
        f"""
        {TARIFF_SELECT}
        ORDER BY s.name, t.valid_from DESC
        """
    ).fetchall()
    return rows


@router.get("/active", response_model=list[TariffRead])
def list_active_tariffs(connection: ConnectionDependency, on_date: date | None = None):
    effective_date = on_date or date.today()
    rows = connection.execute(
        f"""
        {TARIFF_SELECT}
        JOIN (
            SELECT service_id, MAX(valid_from) AS valid_from
            FROM tariffs
            WHERE valid_from <= %s
            GROUP BY service_id
        ) active_tariffs
          ON active_tariffs.service_id = t.service_id
         AND active_tariffs.valid_from = t.valid_from
        WHERE s.is_active = TRUE
        ORDER BY s.name
        """,
        (effective_date,),
    ).fetchall()
    return rows


@router.post("", response_model=TariffRead, status_code=status.HTTP_201_CREATED)
def create_tariff(payload: TariffCreate, connection: ConnectionDependency):
    try:
        row = connection.execute(
            f"""
            INSERT INTO tariffs (service_id, price, calc_method, valid_from)
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            (payload.service_id, payload.price, payload.calc_method, payload.valid_from),
        ).fetchone()
        connection.commit()
    except psycopg.errors.UniqueViolation as exc:
        connection.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tariff for this service and date already exists",
        ) from exc
    except psycopg.errors.ForeignKeyViolation as exc:
        connection.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service does not exist",
        ) from exc

    return get_tariff(row["id"], connection)


@router.get("/{tariff_id}", response_model=TariffRead)
def get_tariff(tariff_id: int, connection: ConnectionDependency):
    row = connection.execute(
        f"""
        {TARIFF_SELECT}
        WHERE t.id = %s
        """,
        (tariff_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tariff not found")
    return row


@router.put("/{tariff_id}", response_model=TariffRead)
def update_tariff(tariff_id: int, payload: TariffUpdate, connection: ConnectionDependency):
    current = get_tariff(tariff_id, connection)
    data = payload.model_dump(exclude_unset=True)
    merged = {**current, **data}

    try:
        connection.execute(
            """
            UPDATE tariffs
            SET service_id = %s,
                price = %s,
                calc_method = %s,
                valid_from = %s
            WHERE id = %s
            """,
            (
                merged["service_id"],
                merged["price"],
                merged["calc_method"],
                merged["valid_from"],
                tariff_id,
            ),
        )
        connection.commit()
    except psycopg.errors.UniqueViolation as exc:
        connection.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tariff for this service and date already exists",
        ) from exc
    except psycopg.errors.ForeignKeyViolation as exc:
        connection.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service does not exist",
        ) from exc

    return get_tariff(tariff_id, connection)


@router.delete("/{tariff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tariff(tariff_id: int, connection: ConnectionDependency):
    try:
        result = connection.execute("DELETE FROM tariffs WHERE id = %s", (tariff_id,))
        if result.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tariff not found")
        connection.commit()
    except psycopg.errors.ForeignKeyViolation as exc:
        connection.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tariff is used by charges and cannot be deleted",
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
