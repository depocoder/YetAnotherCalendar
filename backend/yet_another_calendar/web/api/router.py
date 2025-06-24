from fastapi.routing import APIRouter

from yet_another_calendar.web.api import docs, monitoring, netology, modeus, bulk, lms

api_router = APIRouter()
api_router.include_router(monitoring.router)
# if settings.debug: todo fix after MVP
api_router.include_router(docs.router)
api_router.include_router(netology.router, prefix="/netology", tags=["netology"])
api_router.include_router(modeus.router, prefix="/modeus", tags=["modeus"])
api_router.include_router(bulk.router, prefix="/bulk", tags=["bulk"])
api_router.include_router(lms.router, prefix="/lms", tags=["lms"])
