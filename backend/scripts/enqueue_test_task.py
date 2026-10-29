"""Development utility: enqueue the Celery infrastructure test task.

Run from the backend directory with the virtual environment active:

    python -m scripts.enqueue_test_task

Requires a running Celery worker:

    celery -A app.worker.celery_app:celery_app worker --loglevel=info
"""

import logging

from app.core.logging import setup_logging
from app.worker.tasks import test_task

logger = logging.getLogger(__name__)


def main() -> None:
    setup_logging()
    async_result = test_task.delay()
    logger.info("Test task enqueued (task_id=%s)", async_result.id)


if __name__ == "__main__":
    main()
