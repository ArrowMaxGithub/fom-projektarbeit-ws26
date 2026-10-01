import asyncio
import atexit
import os

from fastapi import FastAPI
from models import *
from psycopg_pool import ConnectionPool
from pydantic_socketio import FastAPISocketIO
from queries import *

app = FastAPI(
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

sio = FastAPISocketIO(app)

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
@sio.event
async def join(sid, player: Player):
    # Get a new connection from the connection pool
    with pool.connection() as conn:
        # Passing query constructor as lambda for error handling and transaction rollback.
        # This return statement will pass data back to the caller as ACK.
        return await guarded_query(sid, lambda: JoinQuery(conn, sid, player))


@sio.event
async def leave(sid, player: Player):
    with pool.connection() as conn:
        return await guarded_query(sid, lambda: LeaveQuery(conn, sid, player))


@sio.event
async def chat(sid, message: ChatMessage):
    await sio.emit("chat", message)
