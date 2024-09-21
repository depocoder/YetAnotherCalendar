"""
Runs the application for production development.
"""
import os

import uvicorn
from rich.console import Console

try:
    import uvloop
except ModuleNotFoundError:
    pass
else:
    uvloop.install()

if __name__ == "__main__":
    os.environ["APP_ENV"] = "prod"
    host = os.environ.get("APP_HOST", "0.0.0.0")
    port = int(os.environ.get("APP_PORT", 8000))

    console = Console()
    console.rule("[bold yellow]Running for prod development", align="left")
    console.print(f"[bold yellow]Visit http://{host}:{port}/")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        lifespan="on",
        log_level="info",
        reload=True,
    )
