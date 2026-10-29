import logging

from app.worker.celery_app import celery_app

# Ensure market-data and snapshot tasks are registered when the worker imports this module.
from app.worker import market_data_tasks as _market_data_tasks  # noqa: F401
from app.worker import snapshot_tasks as _snapshot_tasks  # noqa: F401

logger = logging.getLogger(__name__)


@celery_app.task(name="vestor.test_task")
def test_task() -> str:
    """Verify that Vestor's Celery worker can receive and execute a background task."""
    message = "Vestor Celery test task executed successfully."
    logger.info(message)
    return message
