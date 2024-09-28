from fastapi.routing import APIRouter

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api import docs, monitoring, redis, netology, modeus

api_router = APIRouter()
api_router.include_router(monitoring.router)
api_router.include_router(docs.router)
api_router.include_router(netology.router, prefix="/netology", tags=["netology"])
api_router.include_router(modeus.router, prefix="/modeus", tags=["modeus"])

if settings.debug:
    api_router.include_router(redis.router, prefix="/redis", tags=["redis"])
