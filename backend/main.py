import os

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


@sio.event
async def join(sid):
    print(f"User joined: {sid}")
    await sio.emit("lobby", "User joined")


class ChatMessage(BaseModel):
    sender: str
    content: str


@sio.on("chat")
async def chat(sid, model: ChatMessage):
    await sio.emit("chat", model)
    return {}


@app.get("/api/winner")
async def get_winner():
    cursor = conn.cursor()
    cursor.execute("select id, state from gamestate order by id;")
    rows = cursor.fetchall()
    (_ids, states) = zip(*rows)

    winner = determine_winner(states)

    return {
        "winner": winner,
    }


@app.get("/api/active_player")
async def get_active_player():
    cursor = conn.cursor()
    cursor.execute("select id from active_player;")
    (id,) = cursor.fetchone()

    return {
        "active_player": id,
    }


@app.get("/api/state/{id}")
async def get_single_state(id: int):
    cursor = conn.cursor()
    cursor.execute("select state from gamestate where id = %s;", (id,))
    (state,) = cursor.fetchone()

    return {
        "state": state,
    }


@app.get("/api/states")
async def get_states():
    cursor = conn.cursor()
    cursor.execute("select state from gamestate order by id;")
    rows = cursor.fetchall()
    states = [row[0] for row in rows]

    cursor.execute("select id from active_player;")
    (active_id,) = cursor.fetchone()

    return {
        "states": states,
        "active": active_id,
    }


class StateModel(BaseModel):
    player_id: int


@app.post("/api/state/{id}")
async def post_state(id: int, model: StateModel):
    cursor = conn.cursor()

    cursor.execute("select id from active_player;")
    (active_id,) = cursor.fetchone()
    if active_id == -1 or model.player_id != active_id:
        return

    cursor.execute("select state from gamestate where id = %s;", (id,))
    (state,) = cursor.fetchone()
    if state:
        return

    state = "X" if active_id == 0 else "O"

    cursor.execute("update gamestate set state = %s where id = %s;", (state, id))
    conn.commit()

    cursor.execute("select id, state from gamestate order by id;")
    rows = cursor.fetchall()
    (_ids, states) = zip(*rows)

    winner = determine_winner(states)

    next_active_id = -1 if winner else (active_id + 1) % 2
    cursor.execute("update active_player set id = %s;", (next_active_id,))
    conn.commit()

    return {
        "active": next_active_id,
        "state": state,
        "winner": winner,
    }


@app.post("/api/reset")
async def post_reset():
    cursor = conn.cursor()
    cursor.execute("update gamestate set state = NULL;")
    cursor.execute("update active_player set id = 0;")
    conn.commit()

    cursor.execute("select id from active_player;")
    (active_id,) = cursor.fetchone()

    cursor.execute("select state from gamestate;")
    rows = cursor.fetchall()
    states = [row[0] for row in rows]

    return {
        "active": active_id,
        "states": states,
    }
