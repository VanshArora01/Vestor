"""Import all models so Alembic can discover metadata."""

from app.models.advisor import AdvisorConversation, AdvisorMessage
from app.models.academy import UserAcademyProgress, UserGamification
from app.models.base import Base
from app.models.goal import Goal, GoalContribution
from app.models.invest import (
    Asset,
    InvestmentTransaction,
    PortfolioHolding,
    PortfolioSnapshot,
    PriceCache,
)
from app.models.money import (
    AllocationCategory,
    IncomePattern,
    MonthlyAllocation,
    MonthlyFinance,
    MonthlySpending,
    SpendingCategory,
)
from app.models.user import User
from app.models.banking import (
    BankTransaction,
    ConnectedAccount,
    FinancialConnection,
    FinancialConsent,
)
from app.models.paper_trading import (
    PaperAccount,
    PaperCashLedgerEntry,
    PaperOrder,
    PaperPosition,
    PaperWatchlistItem,
)

__all__ = [
    "Base",
    "AdvisorConversation",
    "AdvisorMessage",
    "UserAcademyProgress",
    "UserGamification",
    "User",
    "Goal",
    "GoalContribution",
    "Asset",
    "PortfolioHolding",
    "InvestmentTransaction",
    "PriceCache",
    "PortfolioSnapshot",
    "MonthlyFinance",
    "AllocationCategory",
    "SpendingCategory",
    "MonthlyAllocation",
    "MonthlySpending",
    "FinancialConnection",
    "FinancialConsent",
    "PaperAccount",
    "PaperPosition",
    "PaperOrder",
    "PaperCashLedgerEntry",
    "PaperWatchlistItem",
]
