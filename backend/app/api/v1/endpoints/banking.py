import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.banking import ProviderListResponse
from app.services.banking_service import BankingService
from app.integrations.setu.exceptions import SetuError

router = APIRouter(prefix="/banking", tags=["banking"])
logger = logging.getLogger(__name__)

from pydantic import BaseModel, Field, validator

class ConnectRequest(BaseModel):
    mobile_number: str = Field(..., description="10-digit Indian mobile number")
    redirect_url: str

    @validator('mobile_number')
    def validate_mobile(cls, v):
        if not v.isdigit() or len(v) != 10:
            raise ValueError('mobile_number must be exactly 10 digits')
        return v

class ConnectResponse(BaseModel):
    consent_id: str
    status: str
    consent_url: str

@router.get("/providers", response_model=ProviderListResponse)
async def get_providers(
    current_user: User = Depends(get_current_user)
) -> ProviderListResponse:
    service = BankingService()
    try:
        return await service.get_providers()
    except SetuError as e:
        logger.error("Setu integration error in get_providers: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not fetch banking providers from our partner at this time. Please try again later."
        )
    except Exception as e:
        logger.exception("Unexpected error in get_providers")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while fetching providers."
        )

@router.post("/connect", response_model=ConnectResponse)
async def connect_bank(
    payload: ConnectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = BankingService(db)
    try:
        return await service.connect_bank(
            user_id=current_user.id, 
            mobile_number=payload.mobile_number, 
            redirect_url=payload.redirect_url
        )
    except Exception as e:
        logger.exception("Error connecting bank")
        raise HTTPException(status_code=500, detail="Failed to initiate bank connection")

@router.get("/consents/{consent_id}")
@router.get("/consents/{consent_id}/status")
async def get_consent_status(
    consent_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = BankingService(db)
    logger.info("Consent status check started for %s", consent_id)
    consent = await service.get_consent_status(user_id=current_user.id, consent_id=consent_id)
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")
    logger.info("Consent %s status: %s", consent_id, consent.get('status'))
    return consent

from typing import List
from decimal import Decimal
from app.schemas.banking import (
    ProviderListResponse, ConnectedAccountSchema,
    PurposeUpdateRequest, TransactionSchema, FinancialConnectionSchema,
    AccountDetailResponse, BankTransactionSchema, AccountTransactionSchema, ClassificationUpdateRequest,
    AggregatedBalancesResponse,
)
from app.models.banking import ConnectedAccount
from datetime import datetime, timezone
from calendar import monthrange
from sqlalchemy import select
from app.models.banking import BankTransaction
from app.services.classification_service import ClassificationService

class MonthlyAnalysisRequest(BaseModel):
    year: int
    month: int
    account_id: UUID | None = None

@router.post("/transactions/analyze-month")
async def analyze_transaction_month(
    payload: MonthlyAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.month < 1 or payload.month > 12 or payload.year < 2000 or payload.year > 2200:
        raise HTTPException(status_code=422, detail="Invalid month")
    start = datetime(payload.year, payload.month, 1, tzinfo=timezone.utc)
    end = datetime(payload.year + (payload.month == 12), payload.month % 12 + 1, 1, tzinfo=timezone.utc)
    if payload.account_id:
        owned_account = db.scalar(select(ConnectedAccount).where(
            ConnectedAccount.id == payload.account_id,
            ConnectedAccount.user_id == current_user.id,
        ))
        if owned_account is None:
            raise HTTPException(status_code=404, detail="Account not found")
    source_is_simulated = bool(payload.account_id and owned_account.institution_name == "Vestor Simulated Bank")
    tx_query = select(BankTransaction).join(ConnectedAccount, BankTransaction.connected_account_id == ConnectedAccount.id).where(
        BankTransaction.user_id == current_user.id,
        *([BankTransaction.connected_account_id == payload.account_id] if payload.account_id else []),
        BankTransaction.transaction_timestamp >= start,
        BankTransaction.transaction_timestamp < end,
    )
    if source_is_simulated:
        tx_query = tx_query.where(BankTransaction.source == "DEMO", ConnectedAccount.institution_name == "Vestor Simulated Bank")
    else:
        tx_query = tx_query.where(BankTransaction.source != "DEMO", ConnectedAccount.institution_name != "Vestor Simulated Bank")
    rows = db.scalars(tx_query).all()
    classifier = ClassificationService(db)
    analyzed = 0
    auto_categorized = 0
    for tx in rows:
        if tx.classification_status in ("USER_CORRECTED", "USER_CONFIRMED") or tx.classification_source == "USER":
            continue
        result = classifier.classify_transaction_dict(current_user.id, tx.connected_account_id, {
            "txnId": tx.provider_transaction_id, "transactionTimestamp": tx.transaction_timestamp,
            "amount": tx.amount, "type": tx.transaction_type, "narration": tx.narration,
            "mode": tx.transaction_mode, "referenceNumber": tx.reference_number,
        })
        tx.classification = result["classification"]
        tx.classification_status = result["classification_status"]
        tx.category = result["category"]
        tx.confidence = result["confidence"]
        tx.classification_source = result["classification_source"]
        tx.merchant_name = tx.merchant_name or result["merchant_name"]
        analyzed += 1
        if tx.classification not in (None, "UNCLASSIFIED"):
            auto_categorized += 1
    db.commit()
    unresolved = [tx for tx in rows if tx.classification in (None, "UNCLASSIFIED")]
    confirmed_income = sum((tx.amount for tx in rows if tx.classification == "INCOME" and tx.classification_status in ("USER_CONFIRMED", "USER_CORRECTED")), Decimal("0"))
    income_candidates = sum((tx.amount for tx in rows if tx.classification == "INCOME" and tx.classification_status not in ("USER_CONFIRMED", "USER_CORRECTED")), Decimal("0"))
    expenses = sum((tx.amount for tx in rows if tx.transaction_type == "DEBIT" and tx.classification == "EXPENSE"), Decimal("0"))
    uncategorized_debits = sum((tx.amount for tx in rows if tx.transaction_type == "DEBIT" and tx.classification in (None, "UNCLASSIFIED")), Decimal("0"))
    total_recorded_ordinary_debits = expenses + uncategorized_debits
    category_totals: dict[str, dict[str, str | int]] = {}
    from app.services.money_service import MoneyService
    from app.models.money import SpendingCategory
    available_categories = MoneyService(db).list_categories(current_user, "spending")
    aliases = {"food": "Food", "groceries": "Food", "shopping": "Shopping", "transport": "Transport", "utilities": "Utilities", "entertainment": "Entertainment", "subscriptions": "Entertainment", "healthcare": "Healthcare", "rent": "Rent", "household": "Household", "travel": "Travel"}
    category_names = {str(item["name"]).strip().lower(): str(item["name"]) for item in available_categories}
    for tx in rows:
        if tx.transaction_type != "DEBIT" or tx.classification not in ("EXPENSE", None, "UNCLASSIFIED"):
            continue
        candidate = "Uncategorised" if tx.classification in (None, "UNCLASSIFIED") else (tx.category or "Uncategorised").strip()
        resolved = category_names.get(candidate.lower()) or category_names.get(aliases.get(candidate.lower(), "").lower())
        key = resolved or candidate
        item = category_totals.setdefault(key, {"category": key, "amount": "0", "count": 0})
        item["amount"] = str(Decimal(str(item["amount"])) + tx.amount)
        item["count"] = int(item["count"]) + 1
    cash_remaining = sum((tx.amount if tx.transaction_type == "CREDIT" and tx.classification == "INCOME" and tx.classification_status in ("USER_CONFIRMED", "USER_CORRECTED") else -tx.amount if tx.transaction_type == "DEBIT" and tx.classification != "TRANSFER" else Decimal("0") for tx in rows), Decimal("0"))
    investment_activity = sum((tx.amount for tx in rows if tx.transaction_type == "DEBIT" and tx.classification == "INVESTMENT"), Decimal("0"))
    transfer_activity = sum((tx.amount for tx in rows if tx.classification == "TRANSFER"), Decimal("0"))
    account_ids = {tx.connected_account_id for tx in rows}
    opening_cash = sum((account.opening_balance or Decimal("0") for account in db.scalars(select(ConnectedAccount).where(
        ConnectedAccount.id.in_(account_ids or {UUID(int=0)}), ConnectedAccount.user_id == current_user.id
    )).all()), Decimal("0"))
    actual_end_cash = opening_cash + cash_remaining
    simulated = any(tx.source == "DEMO" for tx in rows)

    # Reconcile transaction-derived monthly totals through the existing Money
    # service. Preserve the plan ledger and any manual actual categories that
    # have no matching bank transaction.
    from app.services.money_service import MoneyService
    money_service = MoneyService(db)
    month_state = money_service.get_month(current_user, payload.year, payload.month)
    plan_preview = None
    if source_is_simulated:
        # Show the selected simulated source against the same ATP formula used
        # by the Money service, without writing demo activity into the live
        # connected-account plan or its allocations.
        from app.services.money_calculations import build_month_metrics

        live_metrics = month_state["metrics"]
        carryover = Decimal(str(live_metrics.get("carryover") or "0"))
        manual_adjustment = Decimal(str(live_metrics.get("manual_income_adjustment") or "0"))
        simulated_income = confirmed_income + manual_adjustment
        preview_metrics = build_month_metrics(
            income=simulated_income,
            carryover=carryover,
            confirmed_income=confirmed_income,
            manual_income_adjustment=manual_adjustment,
            allocated_total=Decimal("0.00"),
            spending_total=total_recorded_ordinary_debits,
            is_connected=True,
        )
        plan_preview = {
            "carryover": str(carryover),
            "confirmed_income": str(confirmed_income),
            "manual_income_adjustment": str(manual_adjustment),
            "income": str(simulated_income),
            "available_to_plan": preview_metrics["available_to_plan"],
            "allocated_total": "0.00",
            "unallocated": preview_metrics["unallocated"],
        }
    if not source_is_simulated and not month_state["is_locked"]:
        category_rows = db.scalars(select(SpendingCategory).where(
            (SpendingCategory.user_id.is_(None)) | (SpendingCategory.user_id == current_user.id),
            SpendingCategory.is_active.is_(True),
        )).all()
        category_aliases = {"food": ("food", "food & dining"), "groceries": ("food", "food & dining", "groceries"), "shopping": ("shopping", "personal shopping"), "transport": ("transport", "transportation"), "utilities": ("utilities", "bills & utilities"), "entertainment": ("entertainment", "entertainment & lifestyle"), "subscriptions": ("entertainment", "entertainment & lifestyle", "subscriptions"), "rent": ("rent", "housing"), "household": ("household", "housing"), "healthcare": ("healthcare", "medical"), "travel": ("travel",)}
        by_name = {category.name.strip().lower(): category for category in category_rows}
        bank_spend_by_id: dict[UUID, Decimal] = {}
        for tx in rows:
            if tx.transaction_type != "DEBIT" or tx.classification not in ("EXPENSE", None, "UNCLASSIFIED"):
                continue
            if tx.classification in (None, "UNCLASSIFIED"):
                category = by_name.get("uncategorised") or by_name.get("uncategorized")
                if category is None:
                    category = money_service.repo.create_spending_category(user_id=current_user.id, name="Uncategorised")
                    category_rows.append(category)
                    by_name["uncategorised"] = category
            else:
                raw_name = (tx.category or "").strip().lower()
                category = by_name.get(raw_name)
                if category is None:
                    category = next((by_name[name] for name in category_aliases.get(raw_name, ()) if name in by_name), None)
                if category is None:
                    category = next((cat for cat in category_rows if cat.is_others), None)
                if category is None and tx.category and tx.category.strip().lower() not in ("unclassified", "uncategorised", "uncategorized"):
                    category = money_service.repo.create_spending_category(user_id=current_user.id, name=tx.category.strip())
                    category_rows.append(category)
                    by_name[tx.category.strip().lower()] = category
            if category:
                bank_spend_by_id[category.id] = bank_spend_by_id.get(category.id, Decimal("0")) + tx.amount
        current = money_service.repo.get_month(current_user.id, payload.year, payload.month)
        current_by_id = {item.category_id: item.amount for item in current.spendings} if current else {}
        merged = {category_id: amount for category_id, amount in current_by_id.items() if category_id not in bank_spend_by_id}
        merged.update(bank_spend_by_id)
        if bank_spend_by_id:
            money_service.set_spending(current_user, payload.year, payload.month, [
                {"category_id": str(category_id), "amount": str(amount)}
                for category_id, amount in merged.items() if amount > 0
            ])
    return {"year": payload.year, "month": payload.month, "transactions_analyzed": analyzed,
            "transaction_count": len(rows), "auto_categorized": auto_categorized,
            "confirmed_income": str(confirmed_income), "income_candidates": str(income_candidates),
            "ordinary_expenses": str(expenses), "uncategorized_debits": str(uncategorized_debits),
            "total_recorded_ordinary_debits": str(total_recorded_ordinary_debits), "cash_remaining": str(cash_remaining),
            "investment_activity": str(investment_activity), "transfer_activity": str(transfer_activity),
            "opening_cash": str(opening_cash), "actual_end_cash": str(actual_end_cash), "simulated": simulated,
            "plan_preview": plan_preview,
            "category_totals": list(category_totals.values()), "unresolved": [
                {"id": str(tx.id), "description": tx.merchant_name or tx.narration, "date": tx.transaction_timestamp.isoformat(),
                 "amount": str(tx.amount), "direction": tx.transaction_type, "category": tx.category}
                for tx in unresolved]}

@router.get("/transactions", response_model=List[BankTransactionSchema])
async def get_user_transactions(
    limit: int = 500,
    account_id: UUID | None = None,
    source: str = "connected",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if limit < 1 or limit > 1000:
        raise HTTPException(status_code=422, detail="limit must be between 1 and 1000")
    if source not in ("connected", "simulated"):
        raise HTTPException(status_code=422, detail="source must be connected or simulated")
    service = BankingService(db)
    if account_id:
        account = db.scalar(select(ConnectedAccount).where(ConnectedAccount.id == account_id, ConnectedAccount.user_id == current_user.id))
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        is_simulated = account.institution_name == "Vestor Simulated Bank"
        if (source == "simulated") != is_simulated:
            raise HTTPException(status_code=422, detail="Account does not match selected source")
        from app.models.banking import BankTransaction
        return list(db.scalars(select(BankTransaction).where(
            BankTransaction.user_id == current_user.id,
            BankTransaction.connected_account_id == account_id,
            (BankTransaction.source == "DEMO") if is_simulated else (BankTransaction.source != "DEMO"),
        ).order_by(BankTransaction.transaction_timestamp.desc()).limit(limit)).all())
    if source == "simulated":
        from app.models.banking import BankTransaction
        return list(db.scalars(select(BankTransaction).join(ConnectedAccount, BankTransaction.connected_account_id == ConnectedAccount.id).where(
            BankTransaction.user_id == current_user.id,
            ConnectedAccount.user_id == current_user.id,
            ConnectedAccount.institution_name == "Vestor Simulated Bank",
            BankTransaction.source == "DEMO",
        ).order_by(BankTransaction.transaction_timestamp.desc()).limit(limit)).all())
    return service.repo.get_transactions_for_user(current_user.id, limit)

@router.get("/accounts/{account_id}", response_model=AccountDetailResponse)
async def get_account_details(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = BankingService(db)
    detail = service.get_account_detail(user_id=current_user.id, account_id=account_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Get consent expiry
    account = service.repo.get_account_by_id(account_id, current_user.id)
    consent_expires_at = None
    if account and account.connection and account.connection.consents:
        latest_consent = sorted(account.connection.consents, key=lambda x: x.created_at, reverse=True)[0]
        consent_expires_at = latest_consent.expires_at

    return AccountDetailResponse(
        id=account_id,
        institution_name=detail["institution_name"],
        account_type=detail["account_type"],
        masked_account_number=detail["masked_account_number"],
        purpose=detail["purpose"],
        status=detail["status"],
        balance=detail["balance"],
        balance_status=detail["balance_status"],
        balance_timestamp=detail["balance_timestamp"],
        last_synced_at=detail["last_synced_at"],
        consent_expires_at=consent_expires_at,
        transactions=[AccountTransactionSchema(**tx) for tx in detail["transactions"]],
        earmarked_for_goals=detail["earmarked_for_goals"],
        unallocated_balance=detail["unallocated_balance"],
        over_allocated_amount=detail["over_allocated_amount"]
    )

@router.post("/accounts/{account_id}/sync")
async def sync_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = BankingService(db)
    try:
        result = await service.sync_account_data(user_id=current_user.id, account_id=account_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Error syncing account {account_id}")
        raise HTTPException(status_code=500, detail="Failed to sync account data")

@router.get("/connections", response_model=List[FinancialConnectionSchema])
async def get_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = BankingService(db)
    connections = service.repo.get_connections(current_user.id)
    result = []
    for c in connections:
        # Get latest consent status
        latest_consent = sorted(c.consents, key=lambda x: x.created_at, reverse=True)[0] if c.consents else None
        
        result.append(FinancialConnectionSchema(
            id=c.id,
            provider=c.provider,
            status=c.status,
            created_at=c.created_at,
            last_synced_at=c.last_synced_at,
            accounts=[service.enrich_account_schema(a) for a in c.accounts],
            consent_id=latest_consent.id if latest_consent else None,
            consent_status=latest_consent.status if latest_consent else None,
            consent_expires_at=latest_consent.expires_at if latest_consent else None
        ))
    return result

@router.patch("/accounts/{account_id}/purpose", response_model=ConnectedAccountSchema)
async def update_account_purpose(
    account_id: UUID,
    payload: PurposeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = BankingService(db)
    account = service.repo.update_account_purpose(account_id, current_user.id, payload.purpose)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return service.enrich_account_schema(account)

@router.post("/connections/{connection_id}/disconnect", response_model=FinancialConnectionSchema)
async def disconnect_connection(
    connection_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = BankingService(db)
    connection = service.repo.get_connection_by_id(connection_id, current_user.id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    updated_connection = service.repo.disconnect_connection(connection)
    
    latest_consent = sorted(updated_connection.consents, key=lambda x: x.created_at, reverse=True)[0] if updated_connection.consents else None
        
    return FinancialConnectionSchema(
        id=updated_connection.id,
        provider=updated_connection.provider,
        status=updated_connection.status,
        created_at=updated_connection.created_at,
        last_synced_at=updated_connection.last_synced_at,
        accounts=[service.enrich_account_schema(a) for a in updated_connection.accounts],
        consent_id=latest_consent.id if latest_consent else None,
        consent_status=latest_consent.status if latest_consent else None,
        consent_expires_at=latest_consent.expires_at if latest_consent else None
    )


@router.get("/balances/aggregate", response_model=AggregatedBalancesResponse)
async def get_balances_aggregate(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> AggregatedBalancesResponse:
    from app.services.financial_context_service import FinancialContextService
    service = FinancialContextService(db)
    return service.get_balances_aggregation(current_user.id)


@router.patch("/transactions/{transaction_id}/classification", response_model=BankTransactionSchema)
async def update_transaction_classification(
    transaction_id: UUID,
    payload: ClassificationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.banking import BankTransaction
    from sqlalchemy import select
    transaction = db.scalars(
        select(BankTransaction).where(
            BankTransaction.id == transaction_id,
            BankTransaction.user_id == current_user.id
        )
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if payload.classification not in ("INCOME", "EXPENSE"):
        raise HTTPException(status_code=422, detail="Choose an income or spending category")
    if payload.classification == "INCOME" and transaction.transaction_type != "CREDIT":
        raise HTTPException(status_code=422, detail="Only credits can be confirmed as income")
    if payload.classification == "EXPENSE" and transaction.transaction_type != "DEBIT":
        raise HTTPException(status_code=422, detail="Only debits can be confirmed as expenses")

    transaction.classification = payload.classification
    transaction.category = payload.category
    transaction.classification_status = "USER_CORRECTED"
    transaction.classification_source = "USER"
    transaction.confidence = Decimal("1.00")

    # If classification is INCOME, create or update the IncomePattern to remember it
    if payload.classification == "INCOME":
        from app.models.money import IncomePattern
        narration_pat = transaction.narration or "Salary"
        # Check for existing pattern
        existing_pat = db.scalars(
            select(IncomePattern).where(
                IncomePattern.user_id == current_user.id,
                IncomePattern.narration_pattern == narration_pat
            )
        ).first()

        if not existing_pat:
            pattern = IncomePattern(
                user_id=current_user.id,
                narration_pattern=narration_pat,
                merchant_name=transaction.merchant_name or transaction.category or payload.category or "Salary",
                connected_account_id=transaction.connected_account_id,
                typical_amount=transaction.amount,
                amount_tolerance=transaction.amount * Decimal("0.20"),  # 20% tolerance
                frequency="MONTHLY",
                is_confirmed=True
            )
            db.add(pattern)
        else:
            existing_pat.typical_amount = transaction.amount
            existing_pat.amount_tolerance = transaction.amount * Decimal("0.20")
            existing_pat.is_confirmed = True
            db.add(existing_pat)

    db.commit()
    db.refresh(transaction)
    return transaction



