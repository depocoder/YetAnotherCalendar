from fastapi.routing import APIRouter

from yet_another_calendar.web.api import docs, echo, monitoring, redis, netology

api_router = APIRouter()
api_router.include_router(monitoring.router)
api_router.include_router(docs.router)
api_router.include_router(echo.router, prefix="/echo", tags=["echo"])
api_router.include_router(redis.router, prefix="/redis", tags=["redis"])
api_router.include_router(netology.router, prefix="/netology", tags=["netology"])
