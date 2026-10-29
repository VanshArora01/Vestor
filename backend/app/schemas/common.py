from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorEnvelope(BaseModel):
    detail: ErrorDetail


class HealthResponse(BaseModel):
    status: str = Field(examples=["ok"])
    database: str = Field(examples=["connected"])
