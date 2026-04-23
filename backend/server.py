"""
RifaFacil API - Main Application Entry Point

This is the main FastAPI application that brings together all the
modular components: routes, configuration, and middleware.

Architecture:
    The application is organized into modules:
    - config/: Database and settings configuration
    - dependencies/: Authentication and shared dependencies
    - models/: Pydantic schemas for request/response validation
    - routes/: API endpoint handlers organized by domain
    - services/: Business logic services (email, payments)
    - utils/: Helper functions

Running the Server:
    The server is started by supervisor using uvicorn.
    See /etc/supervisor/conf.d/backend.conf for configuration.
"""

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =============================================================================
# APPLICATION SETUP
# =============================================================================

app = FastAPI(
    title="RifaFacil API",
    description="API para gestión de rifas y sorteos en línea",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

origins = [
    "http://localhost:3000",
]

# =============================================================================
# CORS MIDDLEWARE
# =============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# API ROUTER SETUP
# =============================================================================

# Create main API router with /api prefix
# All routes will be prefixed with /api for Kubernetes ingress routing
api_router = APIRouter(prefix="/api")

# Import and include route modules
from routes import auth_router, raffles_router, payments_router, utils_router, mp_oauth_router  

# Include all routers under the /api prefix
api_router.include_router(auth_router)
api_router.include_router(raffles_router)
api_router.include_router(payments_router)
api_router.include_router(utils_router)
api_router.include_router(mp_oauth_router)

# Mount the API router on the main app
app.include_router(api_router)

# =============================================================================
# STARTUP/SHUTDOWN EVENTS
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """
    Application startup handler.
    
    Runs when the server starts. Used for:
    - Database connection verification
    - Cache warmup
    - Service initialization
    """
    logger.info("🚀 RifaFacil API starting up...")
    
    # Verify database connection
    from config import db
    try:
        await db.command("ping")
        logger.info("✅ MongoDB connection established")
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
    
    logger.info("✅ RifaFacil API v2.0 ready!")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Application shutdown handler.
    
    Runs when the server stops. Used for:
    - Graceful connection closure
    - Resource cleanup
    """
    logger.info("🛑 RifaFacil API shutting down...")
    
    # Close database connection
    from config import client
    client.close()
    
    logger.info("✅ Cleanup complete")


# =============================================================================
# HEALTH CHECK (Root Level)
# =============================================================================

@app.get("/")
async def root():
    """Root health check - returns API status."""
    return {
        "status": "healthy",
        "service": "RifaFacil API",
        "version": "2.0.0"
    }


# =============================================================================
# DEVELOPMENT INFO
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║                    RifaFacil API v2.0                     ║
    ╠═══════════════════════════════════════════════════════════╣
    ║                                                           ║
    ║  This server should be started via supervisor:            ║
    ║    sudo supervisorctl restart backend                     ║
    ║                                                           ║
    ║  API Documentation:                                       ║
    ║    Swagger UI: /api/docs                                  ║
    ║    ReDoc:      /api/redoc                                 ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(app, host="0.0.0.0", port=8001)
