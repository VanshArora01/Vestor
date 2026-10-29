import logging
import ssl
from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings
from app.core.logging import setup_logging

logger = logging.getLogger(__name__)

setup_logging()
settings = get_settings()

celery_app = Celery("vestor")
celery_app.conf.update(
    broker_url=settings.redis_url,
    broker_connection_retry_on_startup=True,
    broker_use_ssl={"ssl_cert_reqs": ssl.CERT_REQUIRED},
    task_ignore_result=True,
    worker_hijack_root_logger=False,
    include=[
        "app.worker.tasks",
        "app.worker.market_data_tasks",
        "app.worker.snapshot_tasks",
    ],
    beat_schedule={
        "refresh-market-prices": {
            "task": "vestor.refresh_market_prices",
            # Refresh after NSE/BSE close; NAVs published later remain available next run.
            "schedule": crontab(
                hour=settings.market_data_refresh_hour_ist,
                minute=settings.market_data_refresh_minute_ist,
            ),
        },
        "create-daily-portfolio-snapshots": {
            "task": "vestor.create_daily_portfolio_snapshots",
            # Daily portfolio snapshot (IST). Not an official market-close guarantee.
            "schedule": crontab(
                hour=settings.portfolio_snapshot_hour_ist,
                minute=settings.portfolio_snapshot_minute_ist,
            ),
        },
    },
    timezone="Asia/Kolkata",
    enable_utc=True,
)

logger.info(
    "Celery configured (daily market refresh %02d:%02d IST; daily snapshot %02d:%02d IST)",
    settings.market_data_refresh_hour_ist,
    settings.market_data_refresh_minute_ist,
    settings.portfolio_snapshot_hour_ist,
    settings.portfolio_snapshot_minute_ist,
)
