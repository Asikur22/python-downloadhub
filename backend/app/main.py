import asyncio
import os
import subprocess
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import SessionLocal
from app.services.aria2 import Aria2Client
from app.services.settings import get_db_settings
from app.tasks.monitor import monitor_loop
from app.routers import downloads, settings as settings_router, health

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(settings.LOGS_DIR, "backend.log"))
    ]
)
logger = logging.getLogger(__name__)

# Track the aria2 subprocess globally
aria2_process = None

async def start_aria2_subprocess(app: FastAPI = None):
    """
    Spins up the aria2c subprocess securely inside the container.
    """
    global aria2_process
    
    # Ensure all required directories exist
    os.makedirs(settings.INCOMPLETE_DIR, exist_ok=True)
    os.makedirs(settings.COMPLETED_DIR, exist_ok=True)
    os.makedirs(settings.CONFIG_DIR, exist_ok=True)
    os.makedirs(settings.LOGS_DIR, exist_ok=True)
    
    # Touch session file if missing
    session_file = os.path.join(settings.CONFIG_DIR, "aria2.session")
    if not os.path.exists(session_file):
        with open(session_file, "w") as f:
            pass
            
    # Command to run aria2c
    cmd = [
        "aria2c",
        "--enable-rpc=true",
        "--rpc-listen-all=false", # Listen only inside the container loopback interface (security)
        "--rpc-listen-port=6800",
        f"--rpc-secret={settings.ARIA2_RPC_SECRET}",
        f"--dir={settings.INCOMPLETE_DIR}",
        f"--input-file={session_file}",
        f"--save-session={session_file}",
        "--save-session-interval=10",
        "--continue=true",
        "--log-level=notice",
        f"--log={os.path.join(settings.LOGS_DIR, 'aria2.log')}"
    ]
    
    logger.info("Starting aria2c subprocess...")
    aria2_process = subprocess.Popen(
        cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    if app:
        app.state.aria2_process = aria2_process
    
    # Small check to ensure it started
    await asyncio.sleep(0.5)
    if aria2_process.poll() is not None:
        logger.error(f"aria2c process failed to start! code: {aria2_process.returncode}")
        raise RuntimeError("Could not start aria2c downloader engine. Check aria2.log for details.")
        
    logger.info(f"aria2c subprocess started successfully (PID: {aria2_process.pid})")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup phase
    
    # Start aria2 subprocess
    await start_aria2_subprocess(app)
    app.state.start_aria2 = lambda: start_aria2_subprocess(app)
    
    # Instantiate aria2 client
    aria2_client = Aria2Client(rpc_url=settings.ARIA2_RPC_URL, secret=settings.ARIA2_RPC_SECRET)
    app.state.aria2_client = aria2_client
    
    # Wait for aria2 RPC to become available
    rpc_ready = False
    for attempt in range(10):
        if await aria2_client.ping():
            rpc_ready = True
            logger.info("Successfully connected to aria2 RPC.")
            break
        logger.warning(f"Waiting for aria2 RPC... Attempt {attempt + 1}/10")
        await asyncio.sleep(0.5)
        
    if not rpc_ready:
        logger.error("Could not reach aria2 RPC interface after 5 seconds!")
        
    # Seed default database settings and push them to aria2
    async with SessionLocal() as db:
        try:
            db_settings = await get_db_settings(db)
            # Sync options to aria2 engine
            aria2_options = {
                "max-concurrent-downloads": str(db_settings.max_concurrent_downloads),
                "split": str(db_settings.connections_per_download),
                "max-connection-per-server": str(db_settings.connections_per_download),
                "max-overall-download-limit": str(db_settings.global_max_download_limit),
                "max-tries": str(db_settings.retry_attempts),
                "retry-wait": str(db_settings.retry_delay)
            }
            if rpc_ready:
                await aria2_client.change_global_option(aria2_options)
                logger.info("Synchronized database settings to downloader engine on startup.")
        except Exception as e:
            logger.error(f"Failed to seed/sync settings on startup: {e}")
            
    # Start background monitor loop
    app.state.monitor_task = asyncio.create_task(monitor_loop(aria2_client))
    
    yield
    
    # 2. Shutdown phase
    logger.info("Shutting down backend...")
    
    # Cancel monitor task
    if hasattr(app.state, "monitor_task"):
        app.state.monitor_task.cancel()
        try:
            await app.state.monitor_task
        except asyncio.CancelledError:
            pass
            
    # Close client
    await aria2_client.close()
    
    # Terminate aria2 subprocess
    global aria2_process
    proc = getattr(app.state, "aria2_process", aria2_process)
    if proc:
        logger.info("Terminating aria2c subprocess...")
        proc.terminate()
        try:
            proc.wait(timeout=5.0)
            logger.info("aria2c subprocess exited cleanly.")
        except subprocess.TimeoutExpired:
            logger.warning("aria2c subprocess did not exit in 5 seconds. Killing it...")
            proc.kill()
            proc.wait()

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(downloads.router, prefix=f"{settings.API_V1_STR}/downloads", tags=["downloads"])
app.include_router(settings_router.router, prefix=f"{settings.API_V1_STR}/settings", tags=["settings"])
app.include_router(health.router, prefix=f"{settings.API_V1_STR}/health", tags=["health"])

@app.get("/")
def read_root():
    return {"message": "Welcome to DownloadHub API"}
