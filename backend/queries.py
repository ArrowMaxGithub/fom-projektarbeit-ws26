from models import *
from psycopg import Connection
from pydantic_socketio import FastAPISocketIO


class Query:
    # conn: PostgreSQL-connection
    # sid: Socket ID of the calling client
    # input: Any pydantic input model from models.py
    def __init__(self, conn: Connection, sid, *input): ...

    # sio: Socket.IO Server
    async def fullfill(self, sio: FastAPISocketIO): ...


class LoginQuery(Query):
    # Queries are constructed using SQL-transactions
    # On any encountered exception inside the transaction block, the transaction is rolled back
    def __init__(self, conn: Connection, sid, player_name: str):
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
        return self.player_id


class LogoutQuery(Query):
    def __init__(self, conn: Connection, sid, player_id: int):
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
    def __init__(self, conn: Connection, sid, move: Move):
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

            # TODO: Check for blocked mister_x or blocked detectives
            mister_x_blocked = False
            detectives_blocked = False

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
