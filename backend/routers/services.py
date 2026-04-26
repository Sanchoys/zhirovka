from typing import Annotated

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Response, status

from database import get_connection
from schemas import ServiceCreate, ServiceRead, ServiceUpdate

router = APIRouter()
ConnectionDependency = Annotated[psycopg.Connection, Depends(get_connection)]


@router.get("", response_model=list[ServiceRead])
def list_services(connection: ConnectionDependency):
    rows = connection.execute(
        """
        SELECT id, name, unit, has_meter, include_in_total, description, is_active, created_at, updated_at
        FROM services
        ORDER BY name
        """
    ).fetchall()
    return rows


@router.post("", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
def create_service(payload: ServiceCreate, connection: ConnectionDependency):
    try:
        row = connection.execute(
            """
            INSERT INTO services (name, unit, has_meter, include_in_total, description, is_active)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, name, unit, has_meter, include_in_total, description, is_active, created_at, updated_at
            """,
            (
                payload.name,
                payload.unit,
                payload.has_meter,
                payload.include_in_total,
                payload.description,
                payload.is_active,
            ),
        ).fetchone()
        connection.commit()
    except psycopg.errors.UniqueViolation as exc:
        connection.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Service with this name already exists",
        ) from exc
    return row


@router.get("/{service_id}", response_model=ServiceRead)
def get_service(service_id: int, connection: ConnectionDependency):
    row = connection.execute(
        """
        SELECT id, name, unit, has_meter, include_in_total, description, is_active, created_at, updated_at
        FROM services
        WHERE id = %s
        """,
        (service_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return row


@router.put("/{service_id}", response_model=ServiceRead)
def update_service(service_id: int, payload: ServiceUpdate, connection: ConnectionDependency):
    current = get_service(service_id, connection)
    data = payload.model_dump(exclude_unset=True)
    merged = {**current, **data}

    try:
        row = connection.execute(
            """
            UPDATE services
            SET name = %s,
                unit = %s,
                has_meter = %s,
                include_in_total = %s,
                description = %s,
                is_active = %s
            WHERE id = %s
            RETURNING id, name, unit, has_meter, include_in_total, description, is_active, created_at, updated_at
            """,
            (
                merged["name"],
                merged["unit"],
                merged["has_meter"],
                merged["include_in_total"],
                merged["description"],
                merged["is_active"],
                service_id,
            ),
        ).fetchone()
        connection.commit()
    except psycopg.errors.UniqueViolation as exc:
        connection.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Service with this name already exists",
        ) from exc
    return row


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(service_id: int, connection: ConnectionDependency):
    try:
        result = connection.execute("DELETE FROM services WHERE id = %s", (service_id,))
        if result.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
        connection.commit()
    except psycopg.errors.ForeignKeyViolation as exc:
        connection.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Service is used by tariffs or charges and cannot be deleted",
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
