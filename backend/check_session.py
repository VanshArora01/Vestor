import asyncio
import sys
import os
import json
import httpx

# Add backend root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.integrations.setu.client import SetuClient
from datetime import datetime, timedelta, timezone

async def main():
    client = SetuClient()
    token = await client._get_access_token()
    consent_id = "a7767bce-2020-46dc-b460-b819aff554c9"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "x-product-instance-id": client.settings.setu_product_instance_id,
        "Content-Type": "application/json"
    }
    
    consent_info = await client.get_consent(consent_id)
    print("Consent Info Keys:", list(consent_info.keys()))
    if "detail" in consent_info:
        print("Detail Keys:", list(consent_info["detail"].keys()))
        print("Detail Content:", consent_info["detail"])
    
    # Use consent's dataRange if available, or fall back to safe range
    consent_detail = consent_info.get("detail", {})
    consent_data_range = consent_info.get("consentDataRange") or consent_detail.get("consentDataRange") or consent_info.get("dataRange") or consent_detail.get("dataRange")
    
    print(f"\n--- 1. POST /v2/sessions/refresh/{consent_id} ---")
    async with httpx.AsyncClient(timeout=15.0) as http_client:
        res_ref = await http_client.post(
            f"{client.base_url}/v2/sessions/refresh/{consent_id}",
            headers=headers
        )
        print("POST Refresh status code:", res_ref.status_code)
        print("POST Refresh response:", res_ref.text)
        
        print(f"\n--- 2. POLLING GET /v2/sessions/refresh/{consent_id} ---")
        for i in range(10):
            await asyncio.sleep(2)
            res_get_ref = await http_client.get(
                f"{client.base_url}/v2/sessions/refresh/{consent_id}",
                headers=headers
            )
            print(f"Poll {i+1} status code:", res_get_ref.status_code)
            try:
                data = res_get_ref.json()
                status = data.get("status")
                print(f"Poll {i+1} status: {status}")
                if status in ["COMPLETED", "SUCCESS", "completed", "success"]:
                    print("\n=== COMPLETE SETU FI DATA PAYLOAD ===")
                    print(json.dumps(data, indent=2))
                    break
                elif status not in ["pending", "in-progress"]:
                    print("Status non-pending:", json.dumps(data, indent=2))
                    break
            except Exception as e:
                print("Error parsing response:", e)
        res = await http_client.post(
            f"{client.base_url}/v2/sessions",
            headers=headers,
            json=session_payload
        )
        print("Status code:", res.status_code)
        session_data = res.json()
        print("Session creation response:", json.dumps(session_data, indent=2))
        
        session_id = session_data.get("id") or session_data.get("sessionId")
        if not session_id:
            print("No session ID returned!")
            return
            
        print(f"\n2. Fetching session data for session_id: {session_id}...")
        # Retry up to 5 times if status is PENDING
        for attempt in range(5):
            res_fetch = await http_client.get(
                f"{client.base_url}/v2/sessions/{session_id}",
                headers=headers
            )
            data_res = res_fetch.json()
            status = data_res.get("status")
            print(f"Attempt {attempt+1}: status = {status}")
            if status in ["COMPLETED", "FAILED"]:
                print("\n--- FETCHED DATA SESSION ---")
                print(json.dumps(data_res, indent=2))
                break
            await asyncio.sleep(2)

if __name__ == "__main__":
    asyncio.run(main())
