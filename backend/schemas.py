from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ObjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    object_type: str = Field(default="apartment", min_length=1, max_length=60)
    address: str | None = None
    area_m2: Decimal = Field(ge=0)
    residents_count: int = Field(default=0, ge=0)
    is_active: bool = True


class ObjectCreate(ObjectBase):
    pass


class ObjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    object_type: str | None = Field(default=None, min_length=1, max_length=60)
    address: str | None = None
    area_m2: Decimal | None = Field(default=None, ge=0)
    residents_count: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class ObjectRead(ObjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class ServiceBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    unit: str | None = Field(default=None, max_length=40)
    has_meter: bool = False
    include_in_total: bool = True
    description: str | None = None
    is_active: bool = True


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    unit: str | None = Field(default=None, max_length=40)
    has_meter: bool | None = None
    include_in_total: bool | None = None
    description: str | None = None
    is_active: bool | None = None


class ServiceRead(ServiceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


CalcMethod = Literal["per_unit", "per_area", "per_person", "fixed", "manual"]


class TariffBase(BaseModel):
    service_id: int = Field(gt=0)
    price: Decimal = Field(ge=0)
    calc_method: CalcMethod
    valid_from: date


class TariffCreate(TariffBase):
    pass


class TariffUpdate(BaseModel):
    service_id: int | None = Field(default=None, gt=0)
    price: Decimal | None = Field(default=None, ge=0)
    calc_method: CalcMethod | None = None
    valid_from: date | None = None


class TariffRead(TariffBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_name: str
    service_unit: str | None = None
    created_at: datetime
    updated_at: datetime


class MonthlyChargeFormItem(BaseModel):
    service_id: int
    service_name: str
    service_unit: str | None = None
    has_meter: bool
    include_in_total: bool
    tariff_id: int
    price: Decimal
    calc_method: CalcMethod
    valid_from: date
    previous_reading: Decimal | None = None
    current_reading: Decimal | None = None
    consumption: Decimal = Field(default=0, ge=0)
    billable_quantity: Decimal = Field(default=0, ge=0)
    final_cost: Decimal = Field(default=0, ge=0)


class MonthlyRecordFormData(BaseModel):
    object_id: int
    object_name: str
    area_m2: Decimal
    residents_count: int
    billing_year: int
    billing_month: int
    existing_record_id: int | None = None
    charges: list[MonthlyChargeFormItem]


class MonthlyChargeInput(BaseModel):
    service_id: int = Field(gt=0)
    tariff_id: int = Field(gt=0)
    previous_reading: Decimal | None = Field(default=None, ge=0)
    current_reading: Decimal | None = Field(default=None, ge=0)
    consumption: Decimal = Field(ge=0)
    billable_quantity: Decimal = Field(ge=0)
    applied_price: Decimal = Field(ge=0)
    final_cost: Decimal = Field(ge=0)
    include_in_total: bool = True
    notes: str | None = None


class MonthlyRecordSave(BaseModel):
    object_id: int = Field(gt=0)
    billing_year: int = Field(ge=2000, le=2200)
    billing_month: int = Field(ge=1, le=12)
    notes: str | None = None
    charges: list[MonthlyChargeInput]


class MonthlyChargeRead(MonthlyChargeInput):
    id: int
    service_name: str
    calc_method: CalcMethod


class MonthlyRecordRead(BaseModel):
    id: int
    object_id: int
    object_name: str
    billing_year: int
    billing_month: int
    notes: str | None = None
    total_cost: Decimal
    charges: list[MonthlyChargeRead]
    created_at: datetime
    updated_at: datetime


class DashboardChargeRow(BaseModel):
    object_name: str
    service_name: str
    consumption: Decimal
    billable_quantity: Decimal
    applied_price: Decimal
    final_cost: Decimal
    include_in_total: bool


class DashboardBreakdownItem(BaseModel):
    service_name: str
    total_cost: Decimal


class DashboardTrendItem(BaseModel):
    billing_year: int
    billing_month: int
    total_cost: Decimal


class DashboardSummary(BaseModel):
    billing_year: int
    billing_month: int
    total_cost: Decimal
    records_count: int
    objects_count: int
    services_count: int
    charges: list[DashboardChargeRow]
    breakdown: list[DashboardBreakdownItem]


class DashboardTrend(BaseModel):
    months: list[DashboardTrendItem]
