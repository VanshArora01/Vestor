import sys
sys.path.append("/c/Users/vansh/OneDrive/Desktop/Vestor/backend")

from app.db.session import SessionLocal
from app.services.classification_service import ClassificationService
from uuid import UUID

def run():
    db = SessionLocal()
    try:
        user_id = UUID("9891f84a-5ed7-4339-9e5f-90e8d0942156")
        service = ClassificationService(db)
        classified_count = service.classify_unclassified_transactions(user_id)
        print(f"Classified {classified_count} transactions.")
    finally:
        db.close()

if __name__ == "__main__":
    run()
