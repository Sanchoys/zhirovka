from typing import Annotated

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Response, status

from database import get_connection
from schemas import ObjectCreate, ObjectRead, ObjectUpdate

router = APIRouter()
ConnectionDependency = Annotated[psycopg.Connection, Depends(get_connection)]


@router.get("", response_model=list[ObjectRead])
def list_objects(connection: ConnectionDependency):
    rows = connection.execute(
        """
        SELECT id, name, object_type, address, area_m2, residents_count,
               is_active, created_at, updated_at
        FROM objects
        ORDER BY name
        """
    ).fetchall()
    return rows


@router.post("", response_model=ObjectRead, status_code=status.HTTP_201_CREATED)
def create_object(payload: ObjectCreate, connection: ConnectionDependency):
    row = connection.execute(
        """
        INSERT INTO objects (name, object_type, address, area_m2, residents_count, is_active)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id, name, object_type, address, area_m2, residents_count,
                  is_active, created_at, updated_at
        """,
        (
            payload.name,
            payload.object_type,
            payload.address,
            payload.area_m2,
            payload.residents_count,
            payload.is_active,
        ),
    ).fetchone()
    connection.commit()
    return row


@router.get("/{object_id}", response_model=ObjectRead)
def get_object(object_id: int, connection: ConnectionDependency):
    row = connection.execute(
        """
        SELECT id, name, object_type, address, area_m2, residents_count,
               is_active, created_at, updated_at
        FROM objects
        WHERE id = %s
        """,
        (object_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")
    return row


@router.put("/{object_id}", response_model=ObjectRead)
def update_object(object_id: int, payload: ObjectUpdate, connection: ConnectionDependency):
    current = get_object(object_id, connection)
    data = payload.model_dump(exclude_unset=True)
    merged = {**current, **data}

    row = connection.execute(
        """
        UPDATE objects
        SET name = %s,
            object_type = %s,
            address = %s,
            area_m2 = %s,
            residents_count = %s,
            is_active = %s
        WHERE id = %s
        RETURNING id, name, object_type, address, area_m2, residents_count,
                  is_active, created_at, updated_at
        """,
        (
            merged["name"],
            merged["object_type"],
            merged["address"],
            merged["area_m2"],
            merged["residents_count"],
            merged["is_active"],
            object_id,
        ),
    ).fetchone()
    connection.commit()
    return row


@router.delete("/{object_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_object(object_id: int, connection: ConnectionDependency):
    result = connection.execute("DELETE FROM objects WHERE id = %s", (object_id,))
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")
    connection.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
