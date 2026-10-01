from models import Player
from psycopg import Connection
from pydantic_socketio import FastAPISocketIO


class Query:
    # conn: PostgreSQL-connection
    # sid: Socket ID of the calling client
    # input: Any pydantic input model from models.py
    def __init__(self, conn: Connection, sid, *input): ...

    # sio: Socket.IO Server
    async def fullfill(self, sio: FastAPISocketIO): ...


class JoinQuery(Query):
    # Queries are constructed using SQL-transactions
    # On any encountered exception inside the transaction block, the transaction is rolled back
    def __init__(self, conn: Connection, sid, player: Player):
        self.player = player
        self.sid = sid

        # Transacton block start
        with conn.transaction():
            cursor = conn.cursor()
            # If this failed, the transaction would be rolled back and no changes would be written to the database
            row = cursor.execute(
                t"insert into players (name) values ({self.player.player_name}) returning id;"
            ).fetchone()
            player.player_id = row[0] if row else None

    # Only called if the constructor (and thus all SQL-transactions) succeed
    async def fullfill(self, sio: FastAPISocketIO):
        await sio.emit(
            "chat", {"sender": "Server", "content": f"{self.player.player_name} joined"}
        )
        # Events can pass responses back to the user as ACK
        return True


class LeaveQuery(Query):
    def __init__(self, conn: Connection, sid, player: Player):
        self.player = player
        self.sid = sid
        self.active_player = False

        with conn.transaction():
            cursor = conn.cursor()
            # Note the template string t"{value_here}" with t-prefix instead of regular f-string to avoid any SQL-injections
            cursor.execute(t"delete from players where id = {self.player.player_id};")

    async def fullfill(self, sio: FastAPISocketIO):
        await sio.emit(
            "chat", {"sender": "Server", "content": f"{self.player.player_name} left"}
        )
