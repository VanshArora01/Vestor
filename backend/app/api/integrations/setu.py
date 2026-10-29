import logging
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.banking_service import BankingService

router = APIRouter(tags=["setu-webhooks"])
logger = logging.getLogger(__name__)

@router.post("/webhook")
async def setu_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    logger.info("Received Setu webhook")
    
    service = BankingService(db)
    await service.process_webhook(payload)
    
    return {"status": "ok"}
