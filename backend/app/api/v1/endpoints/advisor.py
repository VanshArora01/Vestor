from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.advisor import (
    ConversationCreateResponse,
    ConversationDetailResponse,
    ConversationListResponse,
    MessageListResponse,
    SendMessageRequest,
    SendMessageResponse,
)
from app.services.advisor_service import AdvisorService

router = APIRouter(prefix="/advisor", tags=["advisor"])


@router.get("/conversations", response_model=ConversationListResponse)
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return AdvisorService(db).list_conversations(current_user)


@router.post("/conversations", response_model=ConversationCreateResponse, status_code=201)
def create_conversation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return AdvisorService(db).create_conversation(current_user)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return AdvisorService(db).get_conversation(current_user, conversation_id)


@router.delete("/conversations/{conversation_id}", status_code=204)
def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    AdvisorService(db).delete_conversation(current_user, conversation_id)
    return Response(status_code=204)


@router.get("/conversations/{conversation_id}/messages", response_model=MessageListResponse)
def list_messages(
    conversation_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    before_id: UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return AdvisorService(db).list_messages(
        current_user, conversation_id, limit=limit, before_id=before_id
    )


@router.post("/messages", response_model=SendMessageResponse)
def send_message(
    payload: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return AdvisorService(db).send_message(
        current_user,
        payload.content,
        conversation_id=payload.conversation_id,
        page_context=payload.page_context,
    )
