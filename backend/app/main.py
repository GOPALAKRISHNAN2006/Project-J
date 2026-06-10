import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import init_db, close_db

# ── Logging Setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("jarvis")

# ── Rate Limiter Setup ────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting JARVIS API...")
    await init_db()
    yield
    await close_db()
    logger.info("JARVIS API shut down.")


app = FastAPI(
    title="JARVIS API",
    description="J.A.R.V.I.S — Just A Rather Very Intelligent System. Developed by Gokul.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Middleware ─────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Global Request Logger
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.debug(f"Request: {request.method} {request.url.path}")
    response = await call_next(request)
    logger.debug(f"Response status: {response.status_code}")
    return response

# ── Routers ────────────────────────────────────────────────────────────────────
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.voice import router as voice_router
from app.api.memory import router as memory_router
from app.api.automation import router as automation_router
from app.api.plugins import router as plugins_router
from app.api.settings import router as settings_router
from app.ws.manager import router as ws_router

app.include_router(auth_router,       prefix="/api/auth",       tags=["Authentication"])
app.include_router(chat_router,       prefix="/api/chat",       tags=["Chat"])
app.include_router(voice_router,      prefix="/api/voice",      tags=["Voice"])
app.include_router(memory_router,     prefix="/api/memory",     tags=["Memory"])
app.include_router(automation_router, prefix="/api/automation", tags=["Automation"])
app.include_router(plugins_router,    prefix="/api/plugins",    tags=["Plugins"])
app.include_router(settings_router,   prefix="/api/settings",   tags=["Settings"])
app.include_router(ws_router,         prefix="/ws",             tags=["WebSocket"])


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "JARVIS is online",
        "status": "operational",
        "version": "1.0.0",
        "codename": "Iron Man",
    }


@app.get("/health", tags=["Root"])
async def health():
    return {"status": "healthy", "service": settings.APP_NAME}
