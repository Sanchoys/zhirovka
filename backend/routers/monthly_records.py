from datetime import date
from decimal import Decimal
from typing import Annotated

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status

from database import get_connection
from schemas import MonthlyRecordFormData, MonthlyRecordRead, MonthlyRecordSave

router = APIRouter()
ConnectionDependency = Annotated[psycopg.Connection, Depends(get_connection)]


@router.get("/form-data", response_model=MonthlyRecordFormData)
def get_monthly_form_data(
    object_id: int,
    billing_year: int,
    billing_month: int,
    connection: ConnectionDependency,
):
    validate_period(billing_year, billing_month)
    billing_date = date(billing_year, billing_month, 1)

    object_row = connection.execute(
        """
        SELECT id, name, area_m2, residents_count
        FROM objects
        WHERE id = %s AND is_active = TRUE
        """,
        (object_id,),
    ).fetchone()
    if object_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")

    existing_record = connection.execute(
        """
        SELECT id
        FROM monthly_records
        WHERE object_id = %s AND billing_year = %s AND billing_month = %s
        """,
        (object_id, billing_year, billing_month),
    ).fetchone()

    charges = connection.execute(
        """
        SELECT s.id AS service_id,
               s.name AS service_name,
               s.unit AS service_unit,
               s.has_meter,
               t.id AS tariff_id,
               t.price,
               t.calc_method,
               t.valid_from,
               COALESCE(current_charge.previous_reading, last_charge.current_reading) AS previous_reading,
               current_charge.current_reading,
               COALESCE(current_charge.consumption, 0) AS consumption,
               COALESCE(current_charge.billable_quantity, 0) AS billable_quantity,
               COALESCE(current_charge.final_cost, 0) AS final_cost
        FROM services s
        JOIN LATERAL (
            SELECT id, price, calc_method, valid_from
            FROM tariffs
            WHERE service_id = s.id AND valid_from <= %s
            ORDER BY valid_from DESC
            LIMIT 1
        ) t ON TRUE
        LEFT JOIN LATERAL (
            SELECT rac.current_reading
            FROM monthly_records mr
            JOIN readings_and_charges rac ON rac.monthly_record_id = mr.id
            WHERE mr.object_id = %s
              AND rac.service_id = s.id
              AND (
                  mr.billing_year < %s
                  OR (mr.billing_year = %s AND mr.billing_month < %s)
              )
            ORDER BY mr.billing_year DESC, mr.billing_month DESC
            LIMIT 1
        ) last_charge ON TRUE
        LEFT JOIN LATERAL (
            SELECT rac.previous_reading,
                   rac.current_reading,
                   rac.consumption,
                   rac.billable_quantity,
                   rac.final_cost
            FROM monthly_records mr
            JOIN readings_and_charges rac ON rac.monthly_record_id = mr.id
            WHERE mr.object_id = %s
              AND mr.billing_year = %s
              AND mr.billing_month = %s
              AND rac.service_id = s.id
            LIMIT 1
        ) current_charge ON TRUE
        WHERE s.is_active = TRUE
        ORDER BY s.name
        """,
        (
            billing_date,
            object_id,
            billing_year,
            billing_year,
            billing_month,
            object_id,
            billing_year,
            billing_month,
        ),
    ).fetchall()

    return {
        "object_id": object_row["id"],
        "object_name": object_row["name"],
        "area_m2": object_row["area_m2"],
        "residents_count": object_row["residents_count"],
        "billing_year": billing_year,
        "billing_month": billing_month,
        "existing_record_id": existing_record["id"] if existing_record else None,
        "charges": charges,
    }


@router.post("", response_model=MonthlyRecordRead, status_code=status.HTTP_201_CREATED)
def save_monthly_record(payload: MonthlyRecordSave, connection: ConnectionDependency):
    validate_period(payload.billing_year, payload.billing_month)

    if not payload.charges:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one charge is required",
        )

    try:
        record = connection.execute(
            """
            INSERT INTO monthly_records (object_id, billing_year, billing_month, notes)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (object_id, billing_year, billing_month)
            DO UPDATE SET notes = EXCLUDED.notes
            RETURNING id
            """,
            (payload.object_id, payload.billing_year, payload.billing_month, payload.notes),
        ).fetchone()

        monthly_record_id = record["id"]
        connection.execute(
            "DELETE FROM readings_and_charges WHERE monthly_record_id = %s",
            (monthly_record_id,),
        )

        for charge in payload.charges:
            connection.execute(
                """
                INSERT INTO readings_and_charges (
                    monthly_record_id, service_id, tariff_id, previous_reading,
                    current_reading, consumption, billable_quantity,
                    applied_price, final_cost, notes
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    monthly_record_id,
                    charge.service_id,
                    charge.tariff_id,
                    charge.previous_reading,
                    charge.current_reading,
                    charge.consumption,
                    charge.billable_quantity,
                    charge.applied_price,
                    charge.final_cost,
                    charge.notes,
                ),
            )

        connection.commit()
    except psycopg.errors.ForeignKeyViolation as exc:
        connection.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Object, service, or tariff does not exist",
        ) from exc
    except psycopg.errors.CheckViolation as exc:
        connection.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid monthly readings or charges",
        ) from exc

    return get_monthly_record(monthly_record_id, connection)


@router.get("/{monthly_record_id}", response_model=MonthlyRecordRead)
def get_monthly_record(monthly_record_id: int, connection: ConnectionDependency):
    record = connection.execute(
        """
        SELECT mr.id, mr.object_id, o.name AS object_name, mr.billing_year,
               mr.billing_month, mr.notes, mr.created_at, mr.updated_at,
               COALESCE(SUM(rac.final_cost), 0) AS total_cost
        FROM monthly_records mr
        JOIN objects o ON o.id = mr.object_id
        LEFT JOIN readings_and_charges rac ON rac.monthly_record_id = mr.id
        WHERE mr.id = %s
        GROUP BY mr.id, o.name
        """,
        (monthly_record_id,),
    ).fetchone()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monthly record not found")

    charges = connection.execute(
        """
        SELECT rac.id, rac.service_id, s.name AS service_name, rac.tariff_id,
               rac.previous_reading, rac.current_reading, rac.consumption,
               rac.billable_quantity, rac.applied_price, rac.final_cost,
               rac.notes, t.calc_method
        FROM readings_and_charges rac
        JOIN services s ON s.id = rac.service_id
        JOIN tariffs t ON t.id = rac.tariff_id
        WHERE rac.monthly_record_id = %s
        ORDER BY s.name
        """,
        (monthly_record_id,),
    ).fetchall()

    return {**record, "charges": charges}


def validate_period(year: int, month: int):
    if year < 2000 or year > 2200 or month < 1 or month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid billing period",
        )
