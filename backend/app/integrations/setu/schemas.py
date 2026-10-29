from pydantic import BaseModel
from typing import List, Optional

class SetuTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int = 3600

class SetuFIPItem(BaseModel):
    fipId: str
    fipName: Optional[str] = None
    name: Optional[str] = None
    fiTypes: List[str] = []
    institutionType: str = ""
    status: str = "ACTIVE"
    
    @property
    def display_name(self) -> str:
        return self.fipName or self.name or "Unknown Provider"
