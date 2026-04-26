from typing import Annotated

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status

from database import get_connection
from schemas import DashboardSummary, DashboardTrend

router = APIRouter()
ConnectionDependency = Annotated[psycopg.Connection, Depends(get_connection)]


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    billing_year: int,
    billing_month: int,
    connection: ConnectionDependency,
):
    validate_period(billing_year, billing_month)

    totals = connection.execute(
        """
        SELECT COALESCE(SUM(rac.final_cost), 0) AS total_cost,
               COUNT(DISTINCT mr.id) AS records_count,
               COUNT(DISTINCT mr.object_id) AS objects_count,
               COUNT(DISTINCT rac.service_id) AS services_count
        FROM monthly_records mr
        LEFT JOIN readings_and_charges rac ON rac.monthly_record_id = mr.id
        WHERE mr.billing_year = %s AND mr.billing_month = %s
        """,
        (billing_year, billing_month),
    ).fetchone()

    charges = connection.execute(
        """
        SELECT o.name AS object_name,
               s.name AS service_name,
               rac.consumption,
               rac.billable_quantity,
               rac.applied_price,
               rac.final_cost
        FROM monthly_records mr
        JOIN objects o ON o.id = mr.object_id
        JOIN readings_and_charges rac ON rac.monthly_record_id = mr.id
        JOIN services s ON s.id = rac.service_id
        WHERE mr.billing_year = %s AND mr.billing_month = %s
        ORDER BY o.name, s.name
        """,
        (billing_year, billing_month),
    ).fetchall()

    breakdown = connection.execute(
        """
        SELECT s.name AS service_name,
               COALESCE(SUM(rac.final_cost), 0) AS total_cost
        FROM monthly_records mr
        JOIN readings_and_charges rac ON rac.monthly_record_id = mr.id
        JOIN services s ON s.id = rac.service_id
        WHERE mr.billing_year = %s AND mr.billing_month = %s
        GROUP BY s.name
        ORDER BY total_cost DESC, s.name
        """,
        (billing_year, billing_month),
    ).fetchall()

    return {
        "billing_year": billing_year,
        "billing_month": billing_month,
        "total_cost": totals["total_cost"],
        "records_count": totals["records_count"],
        "objects_count": totals["objects_count"],
        "services_count": totals["services_count"],
        "charges": charges,
        "breakdown": breakdown,
    }


@router.get("/trend", response_model=DashboardTrend)
def get_dashboard_trend(
    billing_year: int,
    billing_month: int,
    connection: ConnectionDependency,
    months: int = 12,
):
    validate_period(billing_year, billing_month)
    if months < 1 or months > 24:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Months must be between 1 and 24",
        )

    rows = connection.execute(
        """
        WITH month_series AS (
            SELECT date_trunc('month', make_date(%s, %s, 1)) - (offset_value * INTERVAL '1 month') AS month_start
            FROM generate_series(%s - 1, 0, -1) AS offset_value
        )
        SELECT EXTRACT(YEAR FROM ms.month_start)::int AS billing_year,
               EXTRACT(MONTH FROM ms.month_start)::int AS billing_month,
               COALESCE(SUM(rac.final_cost), 0) AS total_cost
        FROM month_series ms
        LEFT JOIN monthly_records mr
          ON mr.billing_year = EXTRACT(YEAR FROM ms.month_start)::int
         AND mr.billing_month = EXTRACT(MONTH FROM ms.month_start)::int
        LEFT JOIN readings_and_charges rac ON rac.monthly_record_id = mr.id
        GROUP BY ms.month_start
        ORDER BY ms.month_start
        """,
        (billing_year, billing_month, months),
    ).fetchall()

    return {"months": rows}


def validate_period(year: int, month: int):
    if year < 2000 or year > 2200 or month < 1 or month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid billing period",
        )
