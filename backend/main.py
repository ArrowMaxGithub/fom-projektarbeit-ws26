import asyncio
import atexit
import json
import os
from pathlib import Path

from fastapi import FastAPI
from mocks import mock_game_state, mock_lobby
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
@sio.on("login")
async def login(sid, player_name: str):
    # Get a new connection from the connection pool
    with pool.connection() as conn:
        # Passing query constructor as lambda for error handling and transaction rollback.
        # This return statement will pass data back to the caller as ACK.
        return await guarded_query(sid, lambda: LoginQuery(conn, sid, player_name))


@sio.on("logout")
async def logout(sid, player_id: int):
    with pool.connection() as conn:
        return await guarded_query(sid, lambda: LogoutQuery(conn, sid, player_id))


@sio.on("move")
async def move(sid, move: Move):
    with pool.connection() as conn:
        return await guarded_query(sid, lambda: MoveQuery(conn, sid, move))


@sio.on("start_game")
async def start_game(sid, start: StartGame):
    with pool.connection() as conn:
        return await guarded_query(sid, lambda: StartGameQuery(conn, sid, start))


@sio.on("chat")
async def chat(sid, message: ChatMessage):
    await sio.emit("chat", message)


@sio.on("get_lobby")
async def get_lobby(sid):
    await sio.emit("lobby", mock_lobby())


@sio.on("get_gamestate")
async def get_gamestate(sid):
    await sio.emit("gamestate", mock_game_state())


# Server-to-client event
sio.register_emit("lobby", list[GameInfo], namespace="/")
sio.register_emit("gamestate", GameState, namespace="/")

# Auto-generate asyncapi.json on server start from pydantic-models.
# Needs to be called at the end of the file after all Socket.IO events.
# During development, the Vite dev server auto-generates TypeScript-interfaces from this file.
# Backend: models.py changes -> generate asyncapi.json -> Frontend: generate interfaces.tsx
print("Generating asyncapi.json")
async_api = sio.asyncapi(title="API", version="1")
Path("asyncapi.json").write_text(
    json.dumps(async_api, indent=2) + "\n", encoding="utf-8"
)
