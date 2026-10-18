import asyncio
import atexit
import json
import os
from pathlib import Path

from fastapi import FastAPI
from models import *
from psycopg_pool import ConnectionPool
from pydantic_socketio import ASGIApp, AsyncServer
from queries import *

api = FastAPI(
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
sio = AsyncServer(async_mode="asgi")
app = ASGIApp(sio, other_asgi_app=api)

user = os.getenv("POSTGRES_LOCAL_USER")
password = os.getenv("POSTGRES_LOCAL_PASSWORD")
dbname = os.getenv("POSTGRES_DB")
conninfo = f"host=database port=5432 dbname={dbname} user={user} password={password}"

pool = ConnectionPool(
    conninfo,
    open=True,  # Populate pool on startup
)


async def shutdown_server():
    print("Shutting down Socket.IO server")
    await sio.emit("error", "Server shutting down")  # Inform connected clients
    await sio.shutdown()
    print("Shutdown complete")


def exit():
    print("Server exiting")
    print("Closing PostgreSQL connection pool")
    pool.close()
    asyncio.run(shutdown_server())


atexit.register(exit)


# Error handling and propagation on a failed SQL-transaction
async def guarded_query(sid, QueryFn):
    try:
        query = QueryFn()

    except Exception as reason:  # noqa: BLE001
        print(f"Transaction aborted. Reason: {reason}")
        await sio.emit(
            event="error",
            data=f"Error: {reason}",
            to=sid,  # Send error back to calling client
        )

    else:
        return await query.fullfill(sio)


# sid: Socket ID of the calling client
@sio.on("join")
async def join(sid, player: Player):
    print("JOIN")
    # Get a new connection from the connection pool
    with pool.connection() as conn:
        # Passing query constructor as lambda for error handling and transaction rollback.
        # This return statement will pass data back to the caller as ACK.
        return await guarded_query(sid, lambda: JoinQuery(conn, sid, player))


@sio.on("leave")
async def leave(sid, player: Player):
    with pool.connection() as conn:
        return await guarded_query(sid, lambda: LeaveQuery(conn, sid, player))


@sio.on("chat")
async def chat(sid, message: ChatMessage):
    await sio.emit("chat", message)


# Auto-generate asyncapi.json on server start from pydantic-models.
# Needs to be called at the end of the file after all Socket.IO events.
# During development, the Vite dev server auto-generates TypeScript-interfaces from this file.
# Backend: models.py changes -> generate asyncapi.json -> Frontend: generate interfaces.tsx
print("Generating asyncapi.json")
async_api = sio.asyncapi(title="API", version="1")
Path("asyncapi.json").write_text(
    json.dumps(async_api, indent=2) + "\n", encoding="utf-8"
)
