import os

import psycopg
from fastapi import FastAPI
from models import *
from pydantic_socketio import FastAPISocketIO
from queries import *

app = FastAPI(
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

sio = FastAPISocketIO(app)

conn = psycopg.connect(
    dbname=os.getenv("POSTGRES_DB"),
    host="database",  # docker container name
    user=os.getenv("POSTGRES_LOCAL_USER"),
    password=os.getenv("POSTGRES_LOCAL_PASSWORD"),
    port="5432",
)


async def guarded_query(QueryFn):
    try:
        query = QueryFn()

    except ValueError as e:
        print(f"Transaction aborted due to invalid input. Reason: {e}")
        query.reject(sio)
        raise exception

    except Exception as e:  # noqa: BLE001
        print(f"Transaction aborted. Reason: {e}")
        query.reject(sio)
        raise exception

    else:
        return await query.fullfill(sio)


@sio.event
async def join(sid, player: Player):
    return await guarded_query(lambda: JoinQuery(conn, sid, player))


@sio.event
async def leave(sid, player: Player):
    return await guarded_query(lambda: LeaveQuery(conn, sid, player))


@sio.event
async def play(sid, play: Play):
    return await guarded_query(lambda: PlayQuery(conn, sid, play))


@sio.event
async def chat(sid, message: ChatMessage):
    await sio.emit("chat", message)


@sio.event
async def move(sid, move: Move):
    return await guarded_query(lambda: MoveQuery(conn, sid, move))


@sio.event
async def reset(sid):
    return await guarded_query(lambda: ResetQuery(conn, sid))
