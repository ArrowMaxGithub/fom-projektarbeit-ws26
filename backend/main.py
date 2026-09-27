import os
from collections.abc import Sequence

import psycopg2
from fastapi import FastAPI
from pydantic import BaseModel
from pydantic_socketio import FastAPISocketIO

print("START")

app = FastAPI(
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

sio = FastAPISocketIO(app)

conn = psycopg2.connect(
    database=os.getenv("POSTGRES_DB"),
    host="database",  # docker container name
    user=os.getenv("POSTGRES_LOCAL_USER"),
    password=os.getenv("POSTGRES_LOCAL_PASSWORD"),
    port="5432",
)


def determine_winner(states):
    combinations = (
        # Rows
        (0, 1, 2),
        (3, 4, 5),
        (6, 7, 8),
        # Columns
        (0, 3, 6),
        (1, 4, 7),
        (2, 5, 8),
        # Diagonals
        (0, 4, 8),
        (2, 4, 6),
    )

    winner = None

    for c in combinations:
        if states[c[0]] and (states[c[0]] == states[c[1]] == states[c[2]]):
            winner = states[c[0]]
            print(f"WINNER:{winner}")
            break
    return winner


class Player(BaseModel):
    name: str


@sio.event
async def join(sid, player: Player) -> int:
    cursor = conn.cursor()
    cursor.execute(
        "insert into players (name) values %s returning id;", ((player.name,),)
    )
    conn.commit()
    (player_id,) = cursor.fetchone()

    await sio.emit("chat", {"sender": "Server", "content": f"{player.name} joined"})

    return player_id


class Play(BaseModel):
    player_id: int
    role: int


@sio.event
async def play(sid, play: Play):
    role_labels = ["Spectator", "X", "O"]
    cursor = conn.cursor()
    cursor.execute("select name from players where id = %s;", (play.player_id,))
    (name,) = cursor.fetchone()

    cursor.execute("select count(*) from active_players where role = %s;", (play.role,))
    (taken,) = cursor.fetchone()
    if taken == 0:
        cursor.execute(
            "insert into active_players values %s;",
            ((play.player_id, play.role, play.role == 1),),
        )
        await sio.emit(
            "chat",
            {"sender": "Server", "content": f"{name} plays {role_labels[play.role]}"},
        )
        cursor.execute("select count(*) from active_players;")
        (count,) = cursor.fetchone()
        if count == 2:
            await sio.emit(
                "chat",
                {"sender": "Server", "content": "Game is starting"},
            )
            await sio.emit("start")

        conn.commit()

    return taken == 0


class ChatMessage(BaseModel):
    sender: str
    content: str


@sio.event
async def chat(sid, message: ChatMessage):
    await sio.emit("chat", message)


class Move(BaseModel):
    player_id: int
    field: int


class Gamestate(BaseModel):
    active: int
    states: Sequence[int]
    winner: int


@sio.event
async def move(sid, move: Move):
    print(move)
    cursor = conn.cursor()

    cursor.execute("select id, role from active_players where active = true;")
    row = cursor.fetchone()
    if row is None or move.player_id != row[0]:
        return

    active_id = row[0]
    active_role = row[1]

    cursor.execute("select state from gamestate where id = %s;", (move.field,))
    (state,) = cursor.fetchone()
    if state != 0:
        return

    cursor.execute(
        "update gamestate set state = %s where id = %s;", (active_role, move.field)
    )
    conn.commit()

    cursor.execute("select id, state from gamestate order by id;")
    rows = cursor.fetchall()
    (_fields, states) = zip(*rows)

    winner = determine_winner(states)

    if winner:
        next_active_role = 0
        cursor.execute("update active_players set active = false;")
        cursor.execute("select name from players where id = %s;", (active_id,))
        (name,) = cursor.fetchone()
        await sio.emit(
            "chat",
            {"sender": "Server", "content": f"{name} won"},
        )
    else:
        next_active_role = 2 if active_role == 1 else 1
        cursor.execute(
            "update active_players set active = false where id = %s;", (active_id,)
        )
        cursor.execute(
            "update active_players set active = true where not id = %s;",
            (active_id,),
        )

    conn.commit()
    await sio.emit(
        "gamestate",
        {
            "active": next_active_role,
            "states": states,
            "winner": winner,
        },
    )


@sio.event
async def reset(sid):
    cursor = conn.cursor()
    cursor.execute("delete from active_players;")
    cursor.execute("update gamestate set state = 0;")
    conn.commit()

    await sio.emit(
        "chat",
        {"sender": "Server", "content": "Resetting game"},
    )

    await sio.emit("reset")
