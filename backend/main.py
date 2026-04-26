from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from routers.dashboard import router as dashboard_router
from routers.monthly_records import router as monthly_records_router
from routers.objects import router as objects_router
from routers.services import router as services_router
from routers.tariffs import router as tariffs_router

app = FastAPI(title="ZhirovKA API", version="0.1.0")

app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(objects_router, prefix="/api/objects", tags=["objects"])
app.include_router(services_router, prefix="/api/services", tags=["services"])
app.include_router(tariffs_router, prefix="/api/tariffs", tags=["tariffs"])
app.include_router(monthly_records_router, prefix="/api/monthly-records", tags=["monthly-records"])


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
