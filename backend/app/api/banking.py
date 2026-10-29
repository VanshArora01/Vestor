# -*- coding: utf-8 -*-
"""
Banking API endpoints for Vestor.
"""

from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from typing import Optional

from app.schemas.banking import (
    ConnectedAccountSchema,
    TransactionSchema,
    UpdateTransactionClassificationRequest,
)
from app.services.banking_service import BankingService
from app.models.banking import BankTransaction
from app.repositories.banking_repository import BankingRepository
from app.dependencies import get_db

router = APIRouter(prefix="/banking", tags=["banking"])

