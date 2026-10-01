class Query:
    async def fullfill(self, sio): ...


class PlayQuery(Query):
    def __init__(self, conn, sid, play):
        self.play = play
        self.sid = sid

        with conn.transaction():
            cursor = conn.cursor()
            row = cursor.execute(
                t"select name from players where id = {play.player_id};"
            ).fetchone()
            self.name = row[0] if row else None

            (taken,) = cursor.execute(
                t"select count(*) from active_players where role = {play.role};"
            ).fetchone()

            if taken != 0:
                raise ValueError("Role taken")

            row = cursor.execute(
                t"delete from active_players where id = {play.player_id} returning role;"
            ).fetchone()
            self.previous_role = row[0] if row else None

            active = play.role == 1
            cursor.execute(
                t"insert into active_players values ({play.player_id}, {play.role}, {active});"
            )

            (self.player_count,) = cursor.execute(
                "select count(*) from active_players;"
            ).fetchone()

    async def fullfill(self, sio):
        role_labels = ["Spectator", "X", "O"]
        if self.previous_role:
            await sio.emit(
                "role",
                {
                    "role": self.previous_role,
                    "taken": False,
                },
            )

        await sio.emit(
            "chat",
            {
                "sender": "Server",
                "content": f"{self.name} plays {role_labels[self.play.role]}",
            },
        )
        await sio.emit(
            "role",
            {
                "role": self.play.role,
                "taken": True,
            },
        )
        if self.player_count == 2:
            await sio.emit(
                "chat",
                {"sender": "Server", "content": "Game is starting"},
            )
            await sio.emit("start")

        return True


class JoinQuery(Query):
    def __init__(self, conn, sid, player):
        self.player = player
        self.sid = sid

        with conn.transaction():
            cursor = conn.cursor()
            row = cursor.execute(
                t"insert into players (name) values ({self.player.player_name}) returning id;"
            ).fetchone()
            player.player_id = row[0] if row else None

            rows = cursor.execute(
                t"select id, state from gamestate order by id;"
            ).fetchall()
            (_fields, self.states) = zip(*rows)

            row = cursor.execute(
                "select id from active_players where active = true;"
            ).fetchone()
            self.active = row[0] if row else None

            rows = cursor.execute("select role from active_players;").fetchall()
            self.roles = [False, False, False]
            for row in rows:
                self.roles[row[0]] = True

            self.winner = determine_winner(self.states)

    async def fullfill(self, sio):
        await sio.emit(
            "chat", {"sender": "Server", "content": f"{self.player.player_name} joined"}
        )

        return (
            {
                "player_id": self.player.player_id,
                "player_name": self.player.player_name,
            },
            {
                "active": self.active,
                "states": self.states,
                "winner": self.winner,
            },
            self.roles,
        )


class LeaveQuery(Query):
    def __init__(self, conn, sid, player):
        self.player = player
        self.sid = sid
        self.active_player = False

        with conn.transaction():
            cursor = conn.cursor()
            cursor.execute(t"delete from players where id = {self.player.player_id};")
            row = cursor.execute(
                t"delete from active_players where id = {self.player.player_id} returning id;"
            ).fetchone()
            self.active_player = row is not None
            if self.active_player:
                cursor.execute("delete from active_players;")
                cursor.execute("update gamestate set state = 0;")

    async def fullfill(self, sio):
        await sio.emit(
            "chat", {"sender": "Server", "content": f"{self.player.player_name} left"}
        )
        if self.active_player != 0:
            await sio.emit(
                "chat",
                {"sender": "Server", "content": "Resetting game"},
            )
            await sio.emit("reset")


class ResetQuery(Query):
    def __init__(self, conn, sid):
        self.sid = sid

        with conn.transaction():
            cursor = conn.cursor()
            cursor.execute("delete from active_players;")
            cursor.execute("update gamestate set state = 0;")

    async def fullfill(self, sio):
        await sio.emit(
            "chat",
            {"sender": "Server", "content": "Resetting game"},
        )

        await sio.emit("reset")


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

    draw = False
    winner = None

    for c in combinations:
        if states[c[0]] and (states[c[0]] == states[c[1]] == states[c[2]]):
            winner = states[c[0]]
            print(f"WINNER:{winner}")
            break

    if all(states):
        draw = True

    return (draw, winner)


class MoveQuery(Query):
    def __init__(self, conn, sid, move):
        self.move = move
        self.sid = sid

        with conn.transaction():
            cursor = conn.cursor()
            row = cursor.execute(
                "select id, role from active_players where active = true;"
            ).fetchone()
            active_id = row[0] if row else None
            active_role = row[1] if row else None
            if move.player_id != active_id:
                raise ValueError(f"Illegal move: {move}")

            row = cursor.execute(
                t"select state from gamestate where id = {move.field};"
            ).fetchone()
            state = row[0] if row else None
            if state != 0:
                raise ValueError(f"Illegal move: {move.field}")

            self.legal = True
            cursor.execute(
                t"update gamestate set state = {active_role} where id = {move.field};"
            )

            rows = cursor.execute(
                "select id, state from gamestate order by id;"
            ).fetchall()
            (_fields, self.states) = zip(*rows)

            (self.draw, self.winner) = determine_winner(self.states)
            if self.winner:
                self.next_active_role = -1
                cursor.execute("update active_players set active = false;")
                row = cursor.execute(
                    t"select name from players where id = {active_id};"
                ).fetchone()
                self.winner_name = row[0] if row else None

            elif self.draw:
                self.next_active_role = -1
                cursor.execute(t"update active_players set active = false;")

            else:
                self.next_active_role = 2 if active_role == 1 else 1
                cursor.execute(
                    t"update active_players set active = false where id = {active_id};"
                )
                cursor.execute(
                    t"update active_players set active = true where not id = {active_id};"
                )

    async def fullfill(self, sio):
        if self.winner:
            await sio.emit(
                "chat",
                {"sender": "Server", "content": f"{self.winner_name} won"},
            )

        elif self.draw:
            await sio.emit(
                "chat",
                {"sender": "Server", "content": "Draw"},
            )

        await sio.emit(
            "gamestate",
            {
                "active": self.next_active_role,
                "states": self.states,
                "winner": self.winner,
            },
        )
