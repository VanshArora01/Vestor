import sys
sys.path.append("/c/Users/vansh/OneDrive/Desktop/Vestor/backend")

from app.api.v1.router import api_router

print("API router routes:")
for route in api_router.routes:
    print(f"- {route.methods} {route.path}")
