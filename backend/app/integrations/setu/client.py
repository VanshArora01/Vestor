import logging
import time
from typing import List

import httpx

from app.core.config import get_settings
from app.integrations.setu.schemas import SetuFIPItem
from app.integrations.setu.exceptions import SetuAuthenticationError, SetuAPIError

logger = logging.getLogger(__name__)

class SetuClient:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.setu_base_url
        self.auth_url = "https://orgservice-prod.setu.co/v1/users/login"
        self._access_token = None
        self._token_expires_at = 0

    async def _get_access_token(self) -> str:
        if self._access_token and time.time() < self._token_expires_at:
            return self._access_token

        logger.info("Setu token request started")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.auth_url,
                    headers={
                        "client": "bridge",
                        "Content-Type": "application/json"
                    },
                    json={
                        "clientID": self.settings.setu_client_id,
                        "grant_type": "client_credentials",
                        "secret": self.settings.setu_client_secret
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                expires_in = data.get("expires_in", 3600)
                
                self._access_token = data["access_token"]
                self._token_expires_at = time.time() + expires_in - 60
                
                logger.info("Setu token request succeeded")
                return self._access_token
        except httpx.HTTPStatusError as e:
            logger.error("Setu token request failed with status code %s", e.response.status_code)
            raise SetuAuthenticationError("Failed to authenticate with Setu") from None
        except httpx.RequestError as e:
            logger.error("Setu token request failed due to network error: %s", str(e))
            raise SetuAuthenticationError("Setu authentication network error") from None
        except Exception as e:
            logger.error("Setu token request failed unexpectedly")
            raise SetuAuthenticationError("Unexpected error during Setu authentication") from None

    async def get_fips(self) -> List[SetuFIPItem]:
        token = await self._get_access_token()
        
        logger.info("Setu FIP request started")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/v2/fips",
                    headers={"Authorization": f"Bearer {token}"}
                )
                response.raise_for_status()
                
                data = response.json()
                logger.info("Setu FIP request succeeded")
                
                # Handling Setu's FIP list format
                # Usually it's either an array directly, or under a key
                items = data.get("fips", data) if isinstance(data, dict) else data
                return [SetuFIPItem(**item) for item in items]
                
        except httpx.HTTPStatusError as e:
            logger.error("Setu FIP request failed with status %s", e.response.status_code)
            raise SetuAPIError("Failed to fetch FIPs from Setu", status_code=e.response.status_code) from None
        except httpx.RequestError as e:
            logger.error("Setu FIP request failed due to network error")
            raise SetuAPIError("Network error while fetching FIPs") from None
        except Exception as e:
            logger.error("Setu FIP request failed unexpectedly")
            raise SetuAPIError("Unexpected error fetching FIPs") from None

    async def create_consent(self, mobile_number: str, redirect_url: str) -> dict:
        token = await self._get_access_token()
        
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        
        # 12 months back for data range, 1 year in future for ongoing syncs
        data_range_from = (now - timedelta(days=365)).isoformat() + "Z"
        data_range_to = (now + timedelta(days=365)).isoformat() + "Z"
        
        vua = mobile_number
        
        payload = {
            "vua": vua,
            "dataRange": {
                "from": data_range_from,
                "to": data_range_to
            },
            "consentDuration": {
                "value": 1,
                "unit": "YEAR"
            },
            "consentMode": "STORE",
            "consentTypes": self.settings.setu_consent_types.split(","),
            "fetchType": self.settings.setu_consent_fetch_type,
            "frequency": {
                "value": 1,
                "unit": "DAY"
            },
            "dataLife": {
                "value": self.settings.setu_consent_data_life_value,
                "unit": "MONTH"
            },
            "purpose": {
                "code": "101",
                "refUri": "https://api.rebit.org.in/aa/purpose/101.xml",
                "text": "Wealth or portfolio management",
                "category": {
                    "type": "string"
                }
            },
            "fiTypes": [self.settings.setu_consent_fi_types],
            "redirectUrl": redirect_url
        }

        headers = {
            "Authorization": f"Bearer {token}",
            "x-product-instance-id": self.settings.setu_product_instance_id,
            "Content-Type": "application/json"
        }
        
        # Log sanitized payload structure
        sanitized_payload = {
            "vua present": bool(payload.get("vua")),
            "vua masked": "***" if payload.get("vua") else "",
            "fiTypes": payload.get("fiTypes"),
            "consentTypes": payload.get("consentTypes"),
            "fetchType": payload.get("fetchType"),
            "consentMode": payload.get("consentMode"),
            "dataRange": "PRESENT" if payload.get("dataRange") else "MISSING",
            "frequency": payload.get("frequency"),
            "dataLife": payload.get("dataLife"),
            "purpose": payload.get("purpose"),
            "redirectUrl present": bool(payload.get("redirectUrl"))
        }
        logger.info(f"Setu consent payload structure: {sanitized_payload}")
        
        logger.info("Setu consent creation started")
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{self.base_url}/v2/consents",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                logger.info("Setu consent creation succeeded")
                return response.json()
        except httpx.HTTPStatusError as e:
            try:
                error_body = e.response.json()
                error_code = error_body.get("errorCode") or error_body.get("error", {}).get("code")
                provider_message = error_body.get("errorMessage") or error_body.get("error", {}).get("message")
            except Exception:
                error_body = e.response.text
                error_code = None
                provider_message = None
                
            logger.error(f"Setu consent creation failed. Status: {e.response.status_code}, Code: {error_code}, Message: {provider_message}")
            raise SetuAPIError(
                "Failed to create consent on Setu", 
                status_code=e.response.status_code,
                error_code=error_code,
                provider_message=provider_message
            ) from None
        except httpx.RequestError as e:
            logger.error("Setu consent creation failed due to network error")
            raise SetuAPIError("Network error while creating consent") from None
        except Exception as e:
            logger.error("Setu consent creation failed unexpectedly")
            raise SetuAPIError("Unexpected error creating consent") from None

    async def get_consent(self, consent_id: str) -> dict:
        token = await self._get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "x-product-instance-id": self.settings.setu_product_instance_id
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(f"{self.base_url}/v2/consents/{consent_id}", headers=headers)
                res.raise_for_status()
                return res.json()
        except Exception as e:
            logger.exception(f"Failed to fetch consent {consent_id} from Setu")
            raise SetuAPIError(f"Failed to fetch consent details from Setu") from e

    async def create_data_session(self, consent_id: str, data_range_from: str = None, data_range_to: str = None) -> dict:
        token = await self._get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "x-product-instance-id": self.settings.setu_product_instance_id,
            "Content-Type": "application/json"
        }
        
        if not data_range_from or not data_range_to:
            from datetime import datetime, timedelta, timezone
            now = datetime.now(timezone.utc)
            data_range_from = (now - timedelta(days=365)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
            data_range_to = now.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            
        try:
            consent_detail = await self.get_consent(consent_id)
            valid_from, valid_to = self._get_valid_session_data_range(consent_detail, data_range_from, data_range_to)
            
            logger.info(f"Consent FI range: {consent_detail.get('Detail', {}).get('FIDataRange')}")
            logger.info(f"Requested session range: from={data_range_from} to={data_range_to}")
            logger.info(f"Effective session range: from={valid_from} to={valid_to}")
            
            data_range_from = valid_from
            data_range_to = valid_to
        except Exception as e:
            logger.warning(f"Could not fetch/clamp consent for data session range: {e}")
            
        payload = {
            "consentId": consent_id,
            "dataRange": {
                "from": data_range_from,
                "to": data_range_to
            },
            "format": "json"
        }
        
        logger.info(f"Creating Setu data session for consent {consent_id}")
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(f"{self.base_url}/v2/sessions", headers=headers, json=payload)
                res.raise_for_status()
                return res.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Setu create data session failed: {e.response.status_code} - {e.response.text}")
            raise SetuAPIError("Failed to create Setu data session", status_code=e.response.status_code) from None
        except Exception as e:
            logger.exception(f"Unexpected error creating Setu data session for consent {consent_id}")
            raise SetuAPIError("Error creating data session") from e

    async def get_data_session(self, session_id: str) -> dict:
        token = await self._get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "x-product-instance-id": self.settings.setu_product_instance_id
        }
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(f"{self.base_url}/v2/sessions/{session_id}", headers=headers)
                res.raise_for_status()
                return res.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Setu get data session failed: {e.response.status_code} - {e.response.text}")
            raise SetuAPIError("Failed to fetch Setu data session", status_code=e.response.status_code) from None
        except Exception as e:
            logger.exception(f"Unexpected error fetching Setu data session {session_id}")
            raise SetuAPIError("Error fetching data session") from e

    async def refresh_data_session(self, consent_id: str) -> dict:
        token = await self._get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "x-product-instance-id": self.settings.setu_product_instance_id
        }
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(f"{self.base_url}/v2/sessions/refresh/{consent_id}", headers=headers)
                res.raise_for_status()
                return res.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Setu session refresh failed: {e.response.status_code} - {e.response.text}")
            raise SetuAPIError("Failed to initiate Setu session refresh", status_code=e.response.status_code) from None
        except Exception as e:
            logger.exception(f"Unexpected error refreshing Setu data session for consent {consent_id}")
            raise SetuAPIError("Error initiating data refresh") from e

    async def get_refreshed_data_session(self, consent_id: str) -> dict:
        token = await self._get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "x-product-instance-id": self.settings.setu_product_instance_id
        }
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(f"{self.base_url}/v2/sessions/refresh/{consent_id}", headers=headers)
                res.raise_for_status()
                return res.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Setu get refreshed data session failed: {e.response.status_code} - {e.response.text}")
            raise SetuAPIError("Failed to fetch refreshed Setu session data", status_code=e.response.status_code) from None
        except Exception as e:
            logger.exception(f"Unexpected error fetching refreshed data session for consent {consent_id}")
            raise SetuAPIError("Error fetching refreshed data session") from e

    def _get_valid_session_data_range(self, consent_detail: dict, requested_from: str, requested_to: str) -> tuple[str, str]:
        from datetime import datetime
        
        consent_from_str = consent_detail.get("Detail", {}).get("FIDataRange", {}).get("from")
        consent_to_str = consent_detail.get("Detail", {}).get("FIDataRange", {}).get("to")
        
        if not consent_from_str or not consent_to_str:
            return requested_from, requested_to
            
        try:
            req_from = datetime.fromisoformat(requested_from.replace("Z", "+00:00"))
            req_to = datetime.fromisoformat(requested_to.replace("Z", "+00:00"))
            
            cons_from = datetime.fromisoformat(consent_from_str.replace("Z", "+00:00"))
            cons_to = datetime.fromisoformat(consent_to_str.replace("Z", "+00:00"))
            
            final_from = max(req_from, cons_from)
            final_to = min(req_to, cons_to)
            
            if final_from > final_to:
                final_from = final_to
                
            return final_from.strftime("%Y-%m-%dT%H:%M:%S.000Z"), final_to.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        except Exception as e:
            logger.warning(f"Failed to clamp session data range, using requested dates: {e}")
            return requested_from, requested_to


