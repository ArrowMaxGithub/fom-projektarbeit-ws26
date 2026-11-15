import asyncio
import atexit
import json
import os
from pathlib import Path

import psycopg
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

active_room_sessions: dict[str, tuple[int, int]] = {} #Store active Room for each socket

pool = ConnectionPool(
    conninfo,
    open=True,  # Populate pool on startup
)


# TODO: Remove in prod
def truncate_db_reseed():
    print("Resetting database to initial seed state")
    superpassword = os.getenv("POSTGRES_PASSWORD")
    conninfo = f"host=database port=5432 dbname={dbname} user=postgres password={superpassword}"

    with open("seed.sql", "r") as seed_file:
        seed = seed_file.read()
        with psycopg.connect(conninfo) as conn:
            cursor = conn.cursor()
            cursor.execute(
                t"""
                    TRUNCATE verkehrsmittel, ticketart, benutzer, karte, partie, knoten, verbindung, teilnehmer, ticketbestand, ticketverbrauch, spielzug
                    RESTART IDENTITY
                    CASCADE;
                """
            )
            cursor.execute(seed)

    print("Initialized seed state")


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


@sio.on("room_join")
async def room_join(sid, player_id: int, room_id: int):
    with pool.connection() as conn:
        result = await guarded_query(
            sid, lambda: RoomJoinQuery(conn, sid, player_id, room_id)
        )
        if result is not None:
            active_room_sessions[sid] = (player_id, room_id)
            return result

def clear_room_sessions(room_id: int):
    for client_sid, (_, active_room_id) in list(active_room_sessions.items()):
        if active_room_id == room_id:
            active_room_sessions.pop(client_sid, None)

@sio.on("room_leave")
async def room_leave(sid, player_id: int, room_id: int):
    query = None

    with pool.connection() as conn:
        def create_query():
            nonlocal query
            query = RoomLeaveQuery(conn, sid, player_id, room_id)
            return query
        result = await guarded_query(sid, create_query)

    if result is True:
        if query.delete_room:
            clear_room_sessions(room_id)
        else:
            active_room_sessions.pop(sid, None)
    return result


@sio.on("disconnect")
async def on_disconnect(sid):
    session = active_room_sessions.pop(sid, None)

    if session is not None:
        user_id, room_id = session
        query = None

        with pool.connection() as conn:
            def create_query():
                nonlocal query
                query = RoomLeaveQuery(conn, sid, user_id, room_id)
                return query

            result = await guarded_query(sid, create_query)

        if result is True and query is not None and query.delete_room:
            clear_room_sessions(room_id)


@sio.on("room_create")
async def room_create(sid, settings: RoomSettings):
    with pool.connection() as conn:
        return await guarded_query(
            sid, lambda: CreateRoomQuery(conn, sid, settings)
        )


@sio.on("room_update")
async def room_update(sid, settings: RoomSettings):
    with pool.connection() as conn:
        return await guarded_query(
            sid, lambda: UpdateRoomQuery(conn, sid, settings)
        )


@sio.on("room_delete")
async def room_delete(sid, action: RoomAction):
    with pool.connection() as conn:
        result = await guarded_query(
            sid, lambda: DeleteRoomQuery(conn, sid, action)
        )

    if result is True:
        clear_room_sessions(action.room_id)

    return result

@sio.on("switch_to_game")
async def switch_to_game(sid, request: SwitchToGame):
    with pool.connection() as conn:
        return await guarded_query(
            sid, lambda: SwitchToGameQuery(conn, sid, request)
        )


@sio.on("move")
async def move(sid, move: Move):
    with pool.connection() as conn:
        return await guarded_query(sid, lambda: MoveQuery(conn, sid, move))


@sio.on("start_game")
async def start_game(sid, start: StartGame):
    with pool.connection() as conn:
        return await guarded_query(sid, lambda: StartGameQuery(conn, sid, start))


@sio.on("choose_role")
async def choose_role(sid, choice: ChooseRole):
    with pool.connection() as conn:
        return await guarded_query(sid, lambda: ChooseRoleQuery(conn, sid, choice))


@sio.on("chat")
async def chat(sid, message: ChatMessage):
    return await guarded_query(sid, lambda: ChatQuery(sid, message))


# TODO: Remove in prod
@sio.on("reset_database")
async def reset_database(sid):
    truncate_db_reseed()


# Server-to-client event
sio.register_emit("lobby", list[GameInfo], namespace="/")
sio.register_emit("gamestate", GameState, namespace="/")
sio.register_emit("room_deleted", int, namespace="/")
# Auto-generate asyncapi.json on server start from pydantic-models.
# Needs to be called at the end of the file after all Socket.IO events.
# During development, the Vite dev server auto-generates TypeScript-interfaces from this file.
# Backend: models.py changes -> generate asyncapi.json -> Frontend: generate interfaces.ts
print("Generating asyncapi.json")
async_api = sio.asyncapi(title="API", version="1")
Path("asyncapi.json").write_text(
    json.dumps(async_api, indent=2) + "\n", encoding="utf-8"
)
