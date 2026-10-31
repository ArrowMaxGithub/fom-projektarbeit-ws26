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
        self.player_id = None
        self.player_name = player_name
        self.sid = sid

        # Transacton block start
        with conn.transaction():
            cursor = conn.cursor()
            # Try to get player by name
            self.player_id = cursor.execute(
                t"select id from benutzer where benutzername = {self.player_name};"
            ).fetchone()

            # Or insert new player
            # If this failed (e.g. username already taken), the transaction would be rolled back and no changes would be written to the database
            if self.player_id is None:
                self.player_id = cursor.execute(
                    t"insert into benutzer (benutzername) values ({self.player_name}) returning id;"
                ).fetchone()

    # Only called if the constructor (and thus all SQL-transactions) succeed
    async def fullfill(self, sio: FastAPISocketIO):
        await sio.emit(
            "chat", {"sender": "Server", "content": f"{self.player_name} logged in"}
        )
        # Events can pass responses back to the user as ACK
        return self.player_id[0]


class LogoutQuery(Query):
    def __init__(self, conn: DBConnection, sid, player_id: int):
        self.player_id = player_id
        self.player_name = None
        self.sid = sid

        with conn.transaction():
            cursor = conn.cursor()
            # Note the template string t"{value_here}" with t-prefix instead of regular f-string to avoid any SQL-injections
            self.player_name = cursor.execute(
                t"select benutzername from benutzer where id = {self.player_id};"
            ).fetchone()

    async def fullfill(self, sio: FastAPISocketIO):
        await sio.emit(
            "chat", {"sender": "Server", "content": f"{self.player_name} logged out"}
        )


class MoveQuery(Query):
    def __init__(self, conn: DBConnection, sid, move: Move):
        self.sid = sid
        self.move = move
        self.player_name = None
        self.gamestate = None

        with conn.transaction():
            cursor = conn.cursor()

            # Identify player username
            cursor.execute(
                t"""
                select benutzername 
                from benutzer 
                where id = {self.move.player_id};
                """
            )
            row = cursor.fetchone()
            self.player_name = row[0] if row else None
            assert self.player_name is not None, "Unknown player ID"

            # Check if game is active and query game parameters for gamestate
            cursor.execute(
                t"""
                select id_karte, benutzername, karte.name, karte.breite, karte.hoehe, status, aktuelle_runde, aktuelle_phase, aktuelle_reihenfolge
                from partie 
                where id = {self.move.game_id}
                join benutzer on partie.id_benutzer = benutzer.id
                join karte on partie.id_karte = karte.id;
                """
            )
            row = cursor.fetchone()
            (
                map_id,
                creator_name,
                map_name,
                map_width,
                map_height,
                current_status,
                current_round,
                current_phase,
                active_player_turn_order,
            ) = row if row else None
            assert current_status == Status.InProgress, "Game is not in-play"

            # Check if player is active, matches game's current_phase and actually is at move.from_node
            cursor.execute(
                t"""
                select id, id_aktueller_knoten, teilnehmertyp, spielerrolle, aktiv, reihenfolge
                from teilnehmer 
                where 
                    id_partie = {self.move.game_id} and
                    id_benutzer = {self.move.player_id};
                """
            )
            row = cursor.fetchone()
            (
                ingame_player_id,
                current_node,
                player_type,
                player_role,
                player_is_active,
                player_turn_order,
            ) = row if row else None
            assert player_is_active, "You are not an active player"
            assert player_turn_order == active_player_turn_order, (
                f"It's not your turn. {active_player_turn_order} is active and you are {player_turn_order} in turn order"
            )
            assert player_type == "spieler", (
                f"You are not an active human player, You are {player_type}"
            )
            if current_phase == "detektive":
                assert player_role == "detektiv", (
                    f"Detectives are active and you are a {player_role}"
                )
            elif current_phase == "mister_x":
                assert player_role == "mister_x", (
                    f"Mister-X is active and you are a {player_role}"
                )
            assert current_node == move.from_node, (
                f"You cannot move from {move.from_node}. You are at {current_node}"
            )

            # Check if connection is valid for the chosen ticket
            cursor.execute(
                t"""
                select id_startknoten, id_zielknoten, ticketart.id
                from knoten
                where id_karte = {map_id}
                join verbindung on knoten.id = verbindung.id_startknoten
                join verkehrsmittel on verbindung.id_verkehrsmittel = verkehrsmittel.id
                join ticketart on ticketart.id_verkehrsmittel = verkehrsmittel.id;
                """
            )
            connection = cursor.fetchone()
            assert (move.from_node, move.to_node, move.ticket_type) == connection, (
                f"No connection available from {move.from_node} to {move.to_node} with ticket {move.ticket_type}"
            )

            # Check if player has required ticket
            cursor.execute(
                t"""
                select anzahl
                from ticketbestand
                where 
                    id_teilnehmer = {ingame_player_id} and
                    id_ticketart = {move.ticket_type};
                """
            )
            row = cursor.fetchone()
            ticket_count = row[0] if row else None
            assert ticket_count > 0, (
                f"No ticket remaining for ticket type {move.ticket_type}"
            )

            # Check if another player already is at move.to_node
            cursor.execute(
                t"""
                select spielerrolle
                from teilnehmer
                where 
                    id_partie = {move.game_id} and
                    id_aktueller_knoten = {move.to_node};
                """
            )
            row = cursor.fetchone()
            player_at_role = row[0] if row else None
            if player_role == "detektiv" and player_at_role == "detektiv":
                raise ValueError(f"Another detective is already at {move.to_node}")

            elif player_role == "mister_x" and player_at_role == "detektiv":
                raise ValueError(f"A detective is already at {move.to_node}")

            # Make move on board
            cursor.execute(
                t"""
                update teilnehmer
                set id_aktueller_knoten = {move.to_node}
                where id = {ingame_player_id};
                """
            )

            # Use ticket
            cursor.execute(
                t"""
                update ticketbestand
                set anzahl = {ticket_count - 1}
                where id_teilnehmer = {ingame_player_id};
                """
            )

            # Get all nodes for map
            cursor.execute(
                t"""
                select knoten.id, nummer, position_x, position_y
                from karte
                where karte.id = {map_id}
                join knoten on knoten.id_karte = karte.id;
                """
            )
            rows = cursor.fetchall()
            node_ids = [node_id for (node_id, _, _) in rows]
            nodes = [
                MapNode(
                    node_id=node_id,
                    nummer=number,
                    position_x=pos_x,
                    position_y=pos_y,
                )
                for (node_id, number, pos_x, pos_y) in rows
            ]

            # Get all connections for map
            cursor.execute(
                t"""
                select id_startknoten, id_zielknoten, id_verkehrsmittel
                from verbindung
                where id_startknoten in {node_ids};
                """
            )
            rows = cursor.fetchall()
            connections = [
                Connection(
                    from_node=from_node,
                    to_node=to_node,
                    vehicle=vehicle,
                )
                for (from_node, to_node, vehicle) in rows
            ]
            vehicles = list({conn.vehicle for conn in connection})

            # Get allowed vehicles per ticket
            # Tickets without vehicle restrictions are filtered out
            cursor.execute(
                t"""
                select ticketart.id, ticketart.name, verkehrsmittel.id, verkehrsmittel.name
                from ticketart
                left join verkehrsmittel where ticketart.id_verkehrsmittel = verkehrsmittel.id;
                """
            )
            rows = cursor.fetchall()
            tickets_dict = {
                ticket_type_id: {  # Set
                    Vehicle(vehicle_id=vehicle_id, name=vehicle_name)
                }
                for (ticket_type_id, ticket_name, vehicle_id, vehicle_name) in rows
            }

            # Get per-player status
            mister_x_caught = False
            cursor.execute(
                t"""
                select benutzername, id_ticketart, anzahl, verkehrsmittel.name, spielerrolle, id_startknoten, id_aktueller_knoten, reihenfolge
                from teilnehmer
                where id_partie = {move.game_id}
                join benutzer on teilenhmer.id_benutzer == benutzer.id 
                join ticketbestand on ticketbestand.id_teilnehmer == teilnehmer.id
                join ticketart on ticketart.id == id_ticketart
                join verkehrsmittel on ticketart.id_verkehrsmittel == verkehrsmittel.id;
                """
            )
            rows = cursor.fetchall()

            # This iterates all rows of the query and constructs one large dictionary, indexed by username
            player_dict = {
                username: {
                    "role": role,
                    "start": start,
                    "current": current,
                    "turn_order": turn_order,
                    "tickets": {  # Set
                        Ticket(
                            ticket_type=ticket_type,
                            count=count,
                            allowed_vehicles=list(
                                tickets_dict.get(
                                    ticket_type, vehicles
                                )  # Get full vehicles list for tickets with no vehicle restriction
                            ),
                        )
                    },
                }
                for (
                    username,
                    ticket_type,
                    count,
                    v_name,
                    role,
                    start,
                    current,
                    turn_order,
                ) in rows
            }

            # TODO: Pass dictionary to client direcly instead of transforming to list first?
            players = [
                Player(
                    name=k,
                    role=v["role"],
                    tickets=list(v["tickets"]),
                    starting_node=v["start"],
                    current_node=v["current"],
                    turn_order=v["turn_order"],
                )
                for (k, v) in player_dict.items()
            ]
            mister_x = next(p for p in players if p.role == Role.MisterX)
            detectives = [p for p in players if p.role == Role.Detective]
            player_count = len(detectives) + 1

            # Check if Mister-X was caught
            for d in detectives:
                if detectives[0] == mister_x[0]:
                    mister_x_caught = True
                    break

            # Check if Mister-X escaped
            mister_x_escaped = current_round == 22 and not mister_x_caught

            # Filter available connections based on held tickets
            def get_ticket_conns(
                conns: list[Connection], player: Player
            ) -> list[Connection]:
                player_vehicles = {  # Set of all allowed vehicles for held tickets
                    v for v in t.allowed_vehicles for t in player.tickets if t.count > 0
                }
                return [
                    c
                    for c in conns
                    if c.vehicle in player_vehicles
                    and (  # connections starts from or points to player.current_node
                        c.from_node_id == player.current_node
                        or c.to_node_id == player.current_node
                    )
                ]

            # Reverse connection pointing towards instead of away from player.current_node
            def reverse_conns(
                conns: list[Connection], player: Player
            ) -> list[Connection]:
                return [
                    Connection(
                        connection_id=c.connection_id,
                        vehicle_id=c.vehicle_id,
                        from_node_id=c.from_node_id
                        if c.from_node_id == player.current_node
                        else c.to_node_id,
                        to_node_id=c.to_node_id
                        if c.to_node_id == player.current_node
                        else c.from_node_id,
                    )
                    for c in conns
                ]

            # Filter connections ending on nodes blocked by players
            def filter_player_pos(
                conns: list[Connection], players: list[Player]
            ) -> list[Connection]:
                player_positions = [p.current_node for p in players]
                return [c for c in conns if c.to_node_id not in player_positions]

            # Gets all legal moves per player as a dict indexed by player name
            def get_legal_moves(conns: list[Connection], players: list[Player]) -> dict:
                return {
                    p.name: filter_player_pos(
                        reverse_conns(get_ticket_conns(conns, p), p),
                        players,
                    )
                    for p in players
                }

            # TODO: Legal moves could be sent to clients directly instead of being recalculated by the frontend
            legal_moves = get_legal_moves(connections, players)
            mister_x_blocked = len(legal_moves[mister_x.name]) == 0
            detectives_blocked = all(len(legal_moves[d.name]) == 0 for d in detectives)

            # Update game status if game ended
            if mister_x_escaped:
                game_end_cause = EndCause.MisterXEscaped
            elif detectives_blocked:
                game_end_cause = EndCause.DetectivesBlocked
            elif mister_x_blocked:
                game_end_cause = EndCause.MisterXBlocked
            elif mister_x_caught:
                game_end_cause = EndCause.MisterXCaught
            else:
                game_end_cause = None

            game_status = (
                Status.Ended if game_end_cause is not None else Status.InProgress
            )

            # If game has not ended, set next player active.
            # If this player was the last in the turn order: increment round
            if game_status != Status.InProgress:
                max_turn_order = max(p.turn_order for p in players)
                next_round = (
                    current_round + 1
                    if active_player_turn_order == max_turn_order
                    else current_round
                )
                next_active_player = (active_player_turn_order + 1) % max_turn_order
                cursor.execute(
                    t"""
                    update partie
                    set aktuelle_reihenfolge = {next_active_player}, next_round = {next_round}
                    where id = {move.game_id};
                    """
                )

            # Construct gamestate for event broacast
            info = GameInfo(
                room_id=move.game_id,
                creator_name=creator_name,
                map_name=map_name,
                map_dimensions=[map_width, map_height],
                status=game_status,
                players=player_count,
                current_round=current_round,
                end_cause=game_end_cause,
            )
            self.gamestate = GameState(
                info=info,
                active_player=active_player_turn_order,
                turn_order=turn_order,
                players=players,
                nodes=nodes,
                connections=connections,
                vehicles=vehicles,
            )

    async def fullfill(self, sio: FastAPISocketIO):
        await sio.emit(
            event="chat",
            room=self.move.game_id,
            data={
                "sender": "Server",
                "content": f"{self.player_name} moving from {self.move.from_node} to {self.move.to_node}",
            },
        )

        await sio.emit(
            event="gamestate",
            room=self.move.game_id,
            data=self.gamestate,
        )


class StartGameQuery(Query):
    def __init__(self, conn: DBConnection, sid, start: StartGame):
        self.start = start

        with conn.transaction():
            cursor = conn.cursor()

            # 1 Check game status and host
            cursor.execute(
                """
        SELECT p.status, p.id_benutzer, p.id_karte, b.benutzername, k.name, k.breite, k.hoehe
        FROM partie AS p
        JOIN benutzer AS b ON b.id = p.id_benutzer 
        JOIN karte as k ON k.id = p.id_karte
        WHERE p.id = %s
        FOR UPDATE OF p
        """,
                (start.game_id,),
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
                """
            SELECT id, spielerrolle
            FROM teilnehmer
            WHERE id_partie = %s AND teilnehmertyp = 'spieler' AND aktiv = TRUE
            ORDER BY id
            FOR UPDATE
            """,
                (start.game_id,),
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
                """
            INSERT INTO teilnehmer (id_partie, teilnehmertyp, spielerrolle)
            SELECT %s, 'bobby', 'detektiv'
            FROM generate_series(1, %s)
            RETURNING id
            """,
                (start.game_id, bobby_count),
            )
            bobby_ids = [row[0] for row in cursor.fetchall()]

            # 4 Set turn order (Mister X first)
            turn_order = mister_x + detectives + bobby_ids

            # 5 Select random starting nodes
            cursor.execute(
                """
            SELECT k.id
            FROM knoten AS k
            WHERE k.id_karte = %s
            AND EXISTS (
                SELECT 1 
                FROM verbindung AS v
                WHERE k.id IN (v.id_startknoten, v.id_zielknoten)
            )
            ORDER BY random()
            """,
                (map_id,),
            )
            node_ids = [row[0] for row in cursor.fetchall()]

            if len(node_ids) < len(turn_order):
                raise ValueError("Nicht genug Startknoten auf der Karte.")

            cursor.executemany(
                """
            UPDATE teilnehmer
            SET id_startknoten = %s, id_aktueller_knoten = %s, reihenfolge = %s
            WHERE id = %s
            """,
                [
                    (node, node, order, pid)
                    for order, (pid, node) in enumerate(
                        zip(turn_order, node_ids), start=1
                    )
                ],
            )

            # 6 Initialize ticket inventories
            cursor.execute("select id, name FROM ticketart")
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
            DO UPDATE SET anzahl = EXCLUDED.anzahl
            """,
                ticket_rows,
            )

            # 7 Start Game
            cursor.execute(
                """
        UPDATE partie
        SET status = 'laufend',
            aktuelle_runde = 1,
            aktuelle_phase = 'mister_x',
            aktuelle_reihenfolge = 1
        WHERE id = %s
        """,
                (start.game_id,),
            )

            # 8 Load map for initial GameState
            cursor.execute(
                """
            SELECT id, nummer, position_x, position_y
            FROM knoten
            WHERE id_karte = %s
            """,
                (map_id,),
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
                """
            SELECT v.id, v.id_startknoten, v.id_zielknoten, v.id_verkehrsmittel
            FROM verbindung AS v
            JOIN knoten AS s ON s.id = v.id_startknoten
            JOIN knoten AS z on z.id = v.id_zielknoten
            WHERE s.id_karte = %s AND z.id_karte = %s
            """,
                (map_id, map_id),
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
                """
            SELECT DISTINCT vm.id, vm.name
            FROM verkehrsmittel AS vm
            JOIN verbindung AS v ON v.id_verkehrsmittel = vm.id
            JOIN knoten AS k ON k.id = v.id_startknoten
            WHERE k.id_karte = %s
            """,
                (map_id,),
            )

            vehicles = [
                Vehicle(vehicle_id=vid, name=name) for vid, name in cursor.fetchall()
            ]

            # 9 Load tickets for GameState
            cursor.execute(
                """
            SELECT tb.id_teilnehmer, ta.id, ta.name, ta.id_verkehrsmittel, tb.anzahl
            FROM ticketbestand AS tb
            JOIN ticketart AS ta ON ta.id = tb.id_ticketart
            JOIN teilnehmer AS t ON t.id = tb.id_teilnehmer
            WHERE t.id_partie = %s
            """,
                (start.game_id,),
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
                """
            SELECT t.id, b.benutzername, t.spielerrolle, t.id_startknoten, t.id_aktueller_knoten, t.reihenfolge
            FROM teilnehmer AS t
            LEFT JOIN benutzer AS b ON b.id = t.id_benutzer
            WHERE t.id_partie = %s
            ORDER BY t.reihenfolge NULLS LAST, t.id
            """,
                (start.game_id,),
            )
            players = [
                Player(
                    player_id=pid,
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
                """
                SELECT status
                FROM partie
                WHERE id = %s
                FOR UPDATE
                """,
                (choice.game_id,),
            )
            game = cursor.fetchone()

            if game is None:
                raise ValueError("Partie existiert nicht.")

            if game[0] != Status.Open.value:
                raise ValueError("Rollenauswahl nur in der Lobby möglich")

            # 2 Check participant
            cursor.execute(
                """
                SELECT t.id, b.benutzername
                FROM teilnehmer AS t
                JOIN benutzer AS b on b.id = t.id_benutzer
                WHERE t.id_partie = %s AND t.id_benutzer = %s AND t.teilnehmertyp = 'spieler' AND t.aktiv = TRUE
                """,
                (choice.game_id, choice.player_id),
            )
            player = cursor.fetchone()

            if player is None:
                raise ValueError("Spieler ist kein aktiver Teilnehmer")

            participant_id, self.player_name = player

            # 3 Check wether Mister X is already taken
            if choice.role == Role.MisterX:
                cursor.execute(
                    """
                    SELECT 1
                    FROM teilnehmer
                    WHERE id_partie = %s AND spielerrolle = 'mister_x' AND id != %s
                    """,
                    (choice.game_id, participant_id),
                )

                if cursor.fetchone() is not None:
                    raise ValueError("Mister X ist bereits vergeben")

            # 4 Assign selected Role
            cursor.execute(
                """
                UPDATE teilnehmer
                SET spielerrolle = %s
                WHERE id = %s
                """,
                (choice.role.value, participant_id),
            )

    async def fullfill(self, sio: FastAPISocketIO):
        await sio.emit(
            "chat",
            {
                "sender": "Server",
                "content": f"{self.player_name} hat die Rolle {self.choice.role.value} gewählt.",
            },
            room=str(self.choice.game_id),
        )

        return {
            "player_id": self.choice.player_id,
            "role": self.choice.role.value,
        }
