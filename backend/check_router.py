import sys
sys.path.append("/c/Users/vansh/OneDrive/Desktop/Vestor/backend")

from app.api.v1.endpoints.money import router as money_router

print("Money router routes:")
for route in money_router.routes:
    print(f"- {route.methods} {route.path}")
