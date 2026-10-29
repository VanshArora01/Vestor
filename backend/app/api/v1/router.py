from fastapi import APIRouter

from app.api.v1.endpoints import academy, advisor, auth, banking, goals, health, invest, money
from app.api.v1.endpoints import paper_trading

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(money.router)
api_router.include_router(goals.router)
api_router.include_router(invest.router)
api_router.include_router(paper_trading.router)
api_router.include_router(banking.router)
api_router.include_router(advisor.router)
api_router.include_router(academy.router)
