from helpers import *
from models import *
from psycopg import Connection as DBConnection
from pydantic_socketio import FastAPISocketIO


class Query:
    # conn: PostgreSQL-connection
    # sid: Socket ID of the calling client
    # input: Any pydantic input model from models.py
    def __init__(self, conn: DBConnection, sid, *input): ...

    # sio: Socket.IO Server
    async def fullfill(self, sio: FastAPISocketIO): ...


class LoginQuery(Query):
    # Queries are constructed using SQL-transactions
    # On any encountered exception inside the transaction block, the transaction is rolled back
    def __init__(self, conn: DBConnection, sid, player_name: str):
        self.sid = sid
        self.player_name = player_name
        self.player_id = None
        self.game_infos = []

        # Transacton block start
        with conn.transaction():
            cursor = conn.cursor()
            # Get existing player by name
            self.player_id = get_player_id(cursor, player_name)
            self.player_id = get_player_id(cursor, player_name)

            # Or insert new player
            # If this failed (e.g. username already taken), the transaction would be rolled back and no changes would be written to the database
            if self.player_id is None:
                self.player_id = insert_new_player(cursor, player_name)

            self.game_infos = get_game_infos(cursor)

    # Only called if the constructor (and thus all SQL-transactions) succeed
    async def fullfill(self, sio: FastAPISocketIO):
        await sio.enter_room(self.sid, "lobby")
        await sio.emit(
            "chat",
            {"sender": "Server", "content": f"{self.player_name} logged in"},
            skip_sid=self.sid,
        )
        await sio.emit("lobby", self.game_infos)

        # Events can pass responses back to the user as ACK
        return self.player_id


class LogoutQuery(Query):
    def __init__(self, conn: DBConnection, sid, player_id: int):
        self.sid = sid
        self.player_id = player_id
        self.player_name = None

        with conn.transaction():
            cursor = conn.cursor()
            self.player_name = get_player_name(cursor, player_id)

    async def fullfill(self, sio: FastAPISocketIO):
        await sio.emit(
            "chat",
            {"sender": "Server", "content": f"{self.player_name} logged out"},
            skip_sid=self.sid,
        )


class ChatQuery(Query):
    def __init__(self, sid, message: ChatMessage):
        self.sid = sid
        self.message = message

    async def fullfill(self, sio: FastAPISocketIO):
        rooms = sio.rooms(self.sid)
        await sio.emit("chat", self.message, room=rooms)

        return True


class RoomJoinQuery(Query):
    def __init__(self, conn: DBConnection, sid, player_id: int, room_id: int):
        self.sid = sid
        self.player_id = player_id
        self.room_id = room_id
        self.player_name = None
        self.gamestate = None

        with conn.transaction():
            cursor = conn.cursor()
            self.player_name = get_player_name(cursor, player_id)
            self.gamestate = get_gamestate(cursor, room_id)

            # Insert joining player as spectator; do nothing if player already is part of this game
            cursor.execute(
                t"""
                    INSERT INTO teilnehmer(id_benutzer, id_partie, teilnehmertyp, spielerrolle, aktiv)
                    VALUES (
                        {player_id}, {room_id}, 'zuschauer', NULL, TRUE
                    )
                    ON CONFLICT (id_benutzer, id_partie)
                    DO NOTHING;
                """
            )

    async def fullfill(self, sio: FastAPISocketIO):
        room = str(self.room_id)
        await sio.enter_room(self.sid, room)
        await sio.leave_room(self.sid, "lobby")

        await sio.emit(
            "chat",
            {
                "sender": "Server",
                "content": f"{self.player_name} joined room {self.room_id}",
            },
            room=room,
            skip_sid=self.sid,
        )

        await sio.emit(
            event="gamestate",
            data=self.gamestate,
            to=self.sid,
        )

        return self.room_id


class RoomLeaveQuery(Query):
    def __init__(self, conn: DBConnection, sid, player_id: int, room_id: int):
        self.sid = sid
        self.player_id = player_id
        self.room_id = room_id
        self.player_name = None

        with conn.transaction():
            cursor = conn.cursor()
            self.player_name = get_player_name(cursor, player_id)
            self.game_infos = get_game_infos(cursor)

    async def fullfill(self, sio: FastAPISocketIO):
        room = str(self.room_id)

        await sio.emit(
            "chat",
            {
                "sender": "Server",
                "content": f"{self.player_name} left room {self.room_id}",
            },
            room=room,
            skip_sid=self.sid,
        )

        await sio.leave_room(self.sid, room)
        await sio.enter_room(self.sid, "lobby")
        await sio.emit("lobby", self.game_infos, to=self.sid)

        return True


class MoveQuery(Query):
    def __init__(self, conn: DBConnection, sid, move: Move):
        self.sid = sid
        self.move = move
        self.room = str(move.game_id)
        self.player_name = None
        self.gamestate = None

        with conn.transaction():
            cursor = conn.cursor()

            self.player_name = get_player_name(cursor, move.player_id)

            # Query current game state and check if game is active
            self.gamestate = get_gamestate(cursor, move.game_id)
            # print(f"gamestate: {self.gamestate}")

            assert self.gamestate.info.status == Status.InProgress, (
                "Game is not in-play"
            )

            # Check if player is active, matches game's current_phase and actually is at move.from_node
            player = self.gamestate.get_player(move.player_id)
            # print(f"player: {player}")

            assert player is not None, f"Unknown player with ID: {move.player_id}"
            assert player.turn_order == self.gamestate.active_player, (
                f"It's not your turn. {self.gamestate.active_player} is active and you are {player.turn_order} in turn order"
            )
            assert player.role is not None, (
                f"You are not an active human player, You are {player.role}"
            )
            if self.gamestate.info.current_phase == "detektive":
                assert player_role == "detektiv", (
                    f"Detectives are active and you are a {player_role}"
                )
            elif self.gamestate.info.current_phase == "mister_x":
                assert player_role == "mister_x", (
                    f"Mister-X is active and you are a {player_role}"
                )
            assert player.current_node == move.from_node, (
                f"You cannot move from {move.from_node}. You are at {current_node}"
            )

            print("Player is active")

            # Check if connection is valid for any ticket
            # TODO: Allow player to chose ticket
            connections = self.gamestate.get_connections(move.from_node, move.to_node)
            print(f"connections: {connections}")

            valid_ticket = None
            chosen_connection = None
            for c in connections:
                valid_ticket = self.gamestate.player_can_take_connection(c, player)
                if valid_ticket:
                    chosen_connection = c
                    break

            assert valid_ticket is not None, (
                f"No connection available from {move.from_node} to {move.to_node} with any ticket"
            )

            print(f"Player has valid ticket for connection {chosen_connection}")

            player.move(move.to_node, valid_ticket)

            print("Player moved")

            winner = None
            mister_x_caught = False
            mister_x = self.gamestate.get_mister_x()
            detectives = self.gamestate.get_detectives()

            # Check if Mister-X was caught
            for d in detectives:
                if d.current_node == mister_x.current_node:
                    mister_x_caught = True
                    break

            print("Checked if Mister-X is caught")

            current_round = self.gamestate.info.current_round

            # Check if Mister-X escaped
            mister_x_escaped = current_round == 22 and not mister_x_caught

            print("Checked if Mister-X escaped")

            # TODO: Legal moves could be sent to clients directly instead of being recalculated by the frontend
            legal_moves = self.gamestate.get_legal_moves_per_player()
            print(f"legal moves: {legal_moves}")

            mister_x_blocked = len(legal_moves[mister_x.player_id]) == 0
            detectives_blocked = all(
                len(legal_moves[d.player_id]) == 0 for d in detectives
            )

            print("Checked if either team is blocked")

            # Update game status if game ended
            if mister_x_escaped:
                self.gamestate.info.end_cause = EndCause.MisterXEscaped
                winner = "mister_x"
            elif detectives_blocked:
                self.gamestate.info.end_cause = EndCause.DetectivesBlocked
                winner = "mister_x"
            elif mister_x_blocked:
                self.gamestate.info.end_cause = EndCause.MisterXBlocked
                winner = "detektive"
            elif mister_x_caught:
                self.gamestate.info.end_cause = EndCause.MisterXCaught
                winner = "detektive"

            if self.gamestate.info.end_cause:
                self.gamestate.info.status = Status.Ended

            print("status set")

            # If game is still in progress, set next player active.
            # If this player was the last in the turn order: increment round
            if self.gamestate.info.status == Status.InProgress:
                self.gamestate.set_next_player_active()
                print("Next player is active")

            # Write new gamestate back to database
            set_gamestate(
                cursor=cursor,
                gamestate=self.gamestate,
                active_player=player,
                connection=chosen_connection,
                ticket=valid_ticket,
                current_round=current_round,
                winner=winner,
            )
            print("gamestate set")

    async def fullfill(self, sio: FastAPISocketIO):
        await sio.emit(
            event="chat",
            room=self.room,
            data={
                "sender": "Server",
                "content": f"{self.player_name} moving from {self.move.from_node} to {self.move.to_node}",
            },
        )

        await sio.emit(
            event="gamestate",
            room=self.room,
            data=self.gamestate,
        )


class StartGameQuery(Query):
    def __init__(self, conn: DBConnection, sid, start: StartGame):
        self.start = start

        with conn.transaction():
            cursor = conn.cursor()

            # 1 Check game status and host
            cursor.execute(
                t"""
                    SELECT p.status, p.id_benutzer, p.id_karte, b.benutzername, k.name, k.breite, k.hoehe
                    FROM partie AS p
                    JOIN benutzer AS b ON b.id = p.id_benutzer 
                    JOIN karte as k ON k.id = p.id_karte
                    WHERE p.id = {start.game_id}
                    FOR UPDATE OF p;
                """
            )

            game = cursor.fetchone()

            if game is None:
                raise ValueError("Partie existiert nicht.")

            (
                status,
                host_id,
                map_id,
                host_name,
                map_name,
                width,
                height,
            ) = game

            if host_id != start.player_id:
                raise ValueError("Nur der Host kann die Partie starten.")

            if status != Status.Open.value:
                raise ValueError("Partie ist nicht in der Lobby-Phase.")

            # 2 Check player roles
            cursor.execute(
                t"""
                    SELECT id, spielerrolle
                    FROM teilnehmer
                    WHERE id_partie = {start.game_id} AND teilnehmertyp = 'spieler' AND aktiv = TRUE
                    ORDER BY id
                    FOR UPDATE;
                    """
            )
            humans = cursor.fetchall()

            mister_x = [pid for pid, role in humans if role == "mister_x"]

            detectives = [pid for pid, role in humans if role == "detektiv"]

            if not 2 <= len(humans) <= 6:
                raise ValueError("Partie benötigt zwischen 2 und 6 Spieler")

            if len(mister_x) != 1 or len(detectives) != len(humans) - 1:
                raise ValueError("Genau ein Mister X und mindestens ein Detektiv.")

            # 3 Create Bobbys
            bobby_count = {
                2: 2,
                3: 2,
                4: 1,
            }.get(len(humans), 0)

            cursor.execute(
                t"""
                    INSERT INTO teilnehmer (id_partie, teilnehmertyp, spielerrolle)
                    SELECT {start.game_id}, 'bobby', 'detektiv'
                    FROM generate_series(1, {bobby_count})
                    RETURNING id;
                """
            )
            bobby_ids = [row[0] for row in cursor.fetchall()]

            # 4 Set turn order (Mister X first)
            turn_order = mister_x + detectives + bobby_ids

            # 5 Select random starting nodes
            cursor.execute(
                t"""
                    SELECT k.id
                    FROM knoten AS k
                    WHERE k.id_karte = {map_id}
                    AND EXISTS (
                        SELECT 1 
                        FROM verbindung AS v
                        WHERE k.id IN (v.id_startknoten, v.id_zielknoten)
                    )
                    ORDER BY random();
                """
            )
            node_ids = [row[0] for row in cursor.fetchall()]

            if len(node_ids) < len(turn_order):
                raise ValueError("Nicht genug Startknoten auf der Karte.")

            cursor.executemany(
                """
                    UPDATE teilnehmer
                    SET id_startknoten = %s, id_aktueller_knoten = %s, reihenfolge = %s
                    WHERE id = %s;
                    """,
                [
                    (node, node, order, pid)
                    for order, (pid, node) in enumerate(
                        zip(turn_order, node_ids), start=1
                    )
                ],
            )

            # 6 Initialize ticket inventories
            cursor.execute("SELECT id, name FROM ticketart")
            ticket_ids = {name: tid for tid, name in cursor.fetchall()}

            required = {
                "Taxiticket",
                "Busticket",
                "Undergroundticket",
                "Blackticket",
                "Doppelzugticket",
            }

            if not required.issubset(ticket_ids):
                raise ValueError("Fehlende benötigte Tickettypen in Datenbank.")

            detective_tickets = {
                "Taxiticket": 11,
                "Busticket": 8,
                "Undergroundticket": 4,
                "Blackticket": 0,
                "Doppelzugticket": 0,
            }

            mister_x_tickets = {
                "Taxiticket": 57 - 11 * len(detectives),
                "Busticket": 45 - 8 * len(detectives),
                "Undergroundticket": 23 - 4 * len(detectives),
                "Blackticket": 5,
                "Doppelzugticket": 2,
            }

            ticket_rows = [
                (pid, ticket_ids[name], count)
                for pid, role in humans
                for name, count in (
                    mister_x_tickets if role == "mister_x" else detective_tickets
                ).items()
            ]

            cursor.executemany(
                """
                    INSERT INTO ticketbestand (id_teilnehmer, id_ticketart, anzahl)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (id_teilnehmer, id_ticketart)
                    DO UPDATE SET anzahl = EXCLUDED.anzahl;
                """,
                ticket_rows,
            )

            # 7 Start Game
            cursor.execute(
                t"""
                    UPDATE partie
                    SET status = 'laufend',
                        aktuelle_runde = 1,
                        aktuelle_phase = 'mister_x',
                        aktuelle_reihenfolge = 1
                    WHERE id = {start.game_id};
                """
            )

            # 8 Load map for initial GameState
            cursor.execute(
                t"""
                    SELECT id, nummer, position_x, position_y
                    FROM knoten
                    WHERE id_karte = {map_id};
                """
            )
            nodes = [
                MapNode(
                    node_id=nid,
                    number=num,
                    position_x=x,
                    position_y=y,
                )
                for nid, num, x, y in cursor.fetchall()
            ]

            cursor.execute(
                t"""
                    SELECT v.id, v.id_startknoten, v.id_zielknoten, v.id_verkehrsmittel
                    FROM verbindung AS v
                    JOIN knoten AS s ON s.id = v.id_startknoten
                    JOIN knoten AS z on z.id = v.id_zielknoten
                    WHERE s.id_karte = {map_id} AND z.id_karte = {map_id};
                """
            )
            connections = [
                Connection(
                    connection_id=cid,
                    from_node_id=source,
                    to_node_id=target,
                    vehicle_id=vehicle_id,
                )
                for cid, source, target, vehicle_id in cursor.fetchall()
            ]

            cursor.execute(
                t"""
                    SELECT DISTINCT vm.id, vm.name
                    FROM verkehrsmittel AS vm
                    JOIN verbindung AS v ON v.id_verkehrsmittel = vm.id
                    JOIN knoten AS k ON k.id = v.id_startknoten
                    WHERE k.id_karte = {map_id};
                """
            )

            vehicles = [
                Vehicle(vehicle_id=vid, name=name) for vid, name in cursor.fetchall()
            ]

            # 9 Load tickets for GameState
            cursor.execute(
                t"""
                    SELECT tb.id_teilnehmer, ta.id, ta.name, ta.id_verkehrsmittel, tb.anzahl
                    FROM ticketbestand AS tb
                    JOIN ticketart AS ta ON ta.id = tb.id_ticketart
                    JOIN teilnehmer AS t ON t.id = tb.id_teilnehmer
                    WHERE t.id_partie = {start.game_id};
                """
            )
            tickets_by_player = {}

            for pid, tid, name, vehicle_id, count in cursor.fetchall():
                allowed = (
                    [v for v in vehicles if v.vehicle_id == vehicle_id]
                    if vehicle_id is not None
                    else vehicles
                )
                tickets_by_player.setdefault(pid, []).append(
                    Ticket(
                        ticket_type_id=tid,
                        name=name,
                        count=count,
                        allowed_vehicles=allowed,
                    )
                )

            # 10 Load players for GameState
            cursor.execute(
                t"""
                    SELECT b.id, b.benutzername, t.spielerrolle, t.id_startknoten, t.id_aktueller_knoten, t.reihenfolge
                    FROM teilnehmer AS t
                    LEFT JOIN benutzer AS b ON b.id = t.id_benutzer
                    WHERE t.id_partie = {start.game_id}
                    ORDER BY t.reihenfolge NULLS LAST, t.id;
                """
            )
            players = [
                Player(
                    player_id=pid if pid else -1,
                    name=name or f"Bobby {pid}",
                    role=Role(role) if role else None,
                    tickets=tickets_by_player.get(pid, []),
                    starting_node=starting_node,
                    current_node=current_node,
                    turn_order=order,
                )
                for pid, name, role, starting_node, current_node, order in cursor.fetchall()
            ]

            # 11 Construct initial GameState
            self.gamestate = GameState(
                info=GameInfo(
                    room_id=start.game_id,
                    creator_name=host_name,
                    map_name=map_name,
                    map_dimensions=[width, height],
                    status=Status.InProgress,
                    end_cause=None,
                    players=len(humans),
                    current_round=1,
                    current_phase=Phase.MisterX,
                ),
                active_player=1,
                players=players,
                nodes=nodes,
                connections=connections,
                vehicles=vehicles,
            )

    async def fullfill(self, sio: FastAPISocketIO):
        await sio.emit("gamestate", self.gamestate)
        return {"game_id": self.start.game_id, "status": "laufend"}


class ChooseRoleQuery(Query):
    def __init__(self, conn: DBConnection, sid, choice: ChooseRole):
        self.choice = choice

        with conn.transaction():
            cursor = conn.cursor()

            # 1 Check game status
            cursor.execute(
                t"""
                SELECT status
                FROM partie
                WHERE id = {choice.game_id}
                FOR UPDATE;
                """
            )
            game = cursor.fetchone()

            if game is None:
                raise ValueError("Partie existiert nicht.")

            if game[0] != Status.Open.value:
                raise ValueError("Rollenauswahl nur in der Lobby möglich")

            # 2 Check participant
            cursor.execute(
                t"""
                SELECT t.id, b.benutzername
                FROM teilnehmer AS t
                JOIN benutzer AS b on b.id = t.id_benutzer
                WHERE t.id_partie = {choice.game_id} AND t.id_benutzer = {choice.player_id} AND t.aktiv = TRUE;
                """
            )
            player = cursor.fetchone()

            if player is None:
                raise ValueError("Spieler ist kein aktiver Teilnehmer")

            participant_id, self.player_name = player

            # 3 Check whether Mister X is already taken
            if choice.role == Role.MisterX:
                cursor.execute(
                    t"""
                    SELECT 1
                    FROM teilnehmer
                    WHERE id_partie = {choice.game_id} AND spielerrolle = 'mister_x' AND id != {participant_id}
                    """
                )

                if cursor.fetchone() is not None:
                    raise ValueError("Mister X ist bereits vergeben")

            # 4a Assign selected Role
            if choice.role:
                cursor.execute(
                    t"""
                    UPDATE teilnehmer
                    SET 
                        teilnehmertyp = 'spieler',
                        spielerrolle = {choice.role.value}
                    WHERE id = {participant_id}
                    """
                )

            # 4b Or revert to spectator
            else:
                cursor.execute(
                    t"""
                    UPDATE teilnehmer
                    SET 
                        teilnehmertyp = 'zuschauer',
                        spielerrolle = NULL
                    WHERE id = {participant_id}
                    """
                )

    async def fullfill(self, sio: FastAPISocketIO):
        role_label = self.choice.role.value if self.choice.role else "Zuschauer"
        await sio.emit(
            "chat",
            {
                "sender": "Server",
                "content": f"{self.player_name} hat die Rolle {role_label} gewählt.",
            },
            room=str(self.choice.game_id),
        )

        return True
