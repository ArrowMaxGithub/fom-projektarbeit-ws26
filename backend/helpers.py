from models import *
from psycopg.cursor import Cursor


def insert_new_player(cursor: Cursor, player_name: str) -> int:
    row = cursor.execute(
        t"""
        INSERT INTO benutzer (benutzername) 
        VALUES ({player_name}) 
        returning id;
        """
    ).fetchone()

    player_id = row[0] if row else None
    assert player_id is not None, f"Failed to insert new player with name {player_name}"

    return player_id


def get_player_id(cursor: Cursor, player_name: str) -> int | None:
    row = cursor.execute(
        t"""
        SELECT b.id
        FROM benutzer as b 
        WHERE b.benutzername = {player_name}; 
        """
    ).fetchone()

    player_id = row[0] if row else None

    return player_id


def get_player_name_by_user_id(cursor: Cursor, user_id: int) -> str:
    row = cursor.execute(
        t"""
        SELECT b.benutzername
        FROM benutzer as b 
        WHERE b.id = {user_id}; 
        """
    ).fetchone()

    player_name = row[0] if row else None
    assert player_name is not None, f"Failed to get player name for use ID {user_id}"

    return player_name


def get_player_name_by_player_id(cursor: Cursor, player_id: int) -> str:
    row = cursor.execute(
        t"""
        SELECT b.benutzername
        FROM teilnehmer as t
        JOIN benutzer as b on t.id_benutzer = b.id 
        WHERE t.id = {player_id}; 
        """
    ).fetchone()

    player_name = row[0] if row else None
    assert player_name is not None, f"Failed to get player name for use ID {player_id}"

    return player_name


def get_game_infos(cursor: Cursor, game_ids: list[int] | None = None) -> list[GameInfo]:
    if game_ids is None:
        rows = cursor.execute(
            t"""
            SELECT id 
            FROM partie;
            """
        ).fetchall()
        game_ids = [row[0] for row in rows]

    rows = cursor.execute(
        t"""
        WITH anzahl_teilnehmer(id_partie, anzahl) AS (
            SELECT t.id_partie, COUNT(t.id)
            FROM teilnehmer as t
            WHERE t.teilnehmertyp = 'spieler'
            GROUP BY t.id_partie
        )

        SELECT p.id, b.benutzername, k.name, k.breite, k.hoehe, p.status, p.ende_grund, COALESCE(t.anzahl, 0), p.aktuelle_runde, p.aktuelle_phase
        FROM partie AS p
        JOIN karte AS k ON k.id = id_karte
        JOIN benutzer AS b ON p.id_benutzer = b.id
        LEFT JOIN anzahl_teilnehmer AS t ON t.id_partie = p.id
        WHERE p.id = ANY({game_ids});
        """
    ).fetchall()

    infos = [
        GameInfo(
            room_id=r[0],
            creator_name=r[1],
            map_name=r[2],
            map_dimensions=[r[3], r[4]],
            status=r[5],
            end_cause=r[6],
            players=r[7],
            current_round=r[8],
            current_phase=r[9],
        )
        for r in rows
    ]

    return infos


def get_gamestate(cursor: Cursor, game_id: int) -> GameState:
    map_id = get_map_id(cursor, game_id)

    # Get active player
    row = cursor.execute(
        t"""
        SELECT aktuelle_reihenfolge
        FROM partie
        WHERE partie.id = {game_id};
        """
    ).fetchone()

    active_player = row[0] if row else None

    # Get all nodes and connections for map
    nodes = get_map_nodes(cursor, map_id)
    connections = get_map_connections(cursor, map_id)

    # Get allowed vehicles per ticket
    rows = cursor.execute(
        t"""
        SELECT ticketart.id, ticketart.name, verkehrsmittel.id, verkehrsmittel.name
        FROM ticketart
        RIGHT JOIN verkehrsmittel ON ticketart.id_verkehrsmittel = verkehrsmittel.id;
        """
    ).fetchall()

    tickets_dict = {
        ticket_type_id: {  # Set
            Vehicle(vehicle_id=vehicle_id, name=vehicle_name)
        }
        for (ticket_type_id, ticket_name, vehicle_id, vehicle_name) in rows
    }

    all_vehicles = list(
        {Vehicle(vehicle_id=vid, name=name) for (_, _, vid, name) in rows}
    )

    # Get per-player status
    rows = cursor.execute(
        t"""
        SELECT teilnehmer.id, benutzername, id_ticketart, ticketart.name, anzahl, verkehrsmittel.name, teilnehmertyp, spielerrolle, id_startknoten, id_aktueller_knoten, reihenfolge
        FROM teilnehmer
        LEFT JOIN benutzer ON teilnehmer.id_benutzer = benutzer.id 
        LEFT JOIN ticketbestand ON ticketbestand.id_teilnehmer = teilnehmer.id
        LEFT JOIN ticketart ON ticketart.id = id_ticketart
        LEFT JOIN verkehrsmittel ON ticketart.id_verkehrsmittel = verkehrsmittel.id
        WHERE id_partie = {game_id}
        ORDER BY teilnehmer.id ASC;
        """
    ).fetchall()

    bobby_names = iter([f"Bobby {i}" for i in range(1, 5)])

    # Initialize per-player dict
    player_dict = {
        r[0]: {
            "name": r[1] if r[1] else next(bobby_names),
            "player_type": r[6],
            "role": r[7],
            "start": r[8],
            "current": r[9],
            "turn_order": r[10],
            "tickets": [],
        }
        for r in rows
    }

    # Populate tickets per human player
    for r in rows:
        if r[6] == "bobby" or r[2] is None:
            continue

        player_dict[r[0]]["tickets"].append(
            Ticket(
                ticket_type_id=r[2],
                name=r[3],
                count=r[4],
                allowed_vehicles=list(
                    tickets_dict.get(
                        r[2], all_vehicles
                    )  # Get full vehicles list for tickets with no vehicle restriction
                ),
            )
        )

    players = [
        Player(
            player_id=k,
            name=v["name"],
            player_type=v["player_type"],
            role=v["role"],
            tickets=v["tickets"],
            starting_node=v["start"],
            current_node=v["current"],
            turn_order=v["turn_order"],
        )
        for (k, v) in player_dict.items()
    ]

    info = get_game_infos(cursor, [game_id])[0]

    gamestate = GameState(
        info=info,
        active_player=active_player,
        players=players,
        nodes=nodes,
        connections=connections,
        vehicles=all_vehicles,
    )

    return gamestate


def set_gamestate(
    cursor: Cursor,
    gamestate: GameState,
    active_player: Player,
    connection: Connection,
    ticket: Ticket,
    current_round: int,
    winner: str,
):
    cursor.execute(
        t"""
        UPDATE teilnehmer
        SET id_aktueller_knoten = {active_player.current_node}
        WHERE id = {active_player.player_id};
        """
    )

    if ticket:
        cursor.execute(
            t"""
            UPDATE ticketbestand
            SET anzahl = {ticket.count}
            WHERE 
                id_teilnehmer = {active_player.player_id} AND
                id_ticketart = {ticket.ticket_type_id};
            """
        )

    row = cursor.execute(
        t"""
        INSERT INTO spielzug(id_teilnehmer, id_verbindung, zugnummer, runde)
        VALUES (
            {active_player.player_id}, {connection.connection_id}, {active_player.turn_order}, {current_round}
        )
        RETURNING id;
        """
    ).fetchone()
    turn_id = row[0] if row else None
    assert turn_id is not None, "Failed to insert move into move history"

    if ticket:
        cursor.execute(
            t"""
            INSERT INTO ticketverbrauch(id_spielzug, id_ticketart)
            VALUES (
                {turn_id}, {ticket.ticket_type_id}
            );
            """
        )

    status = gamestate.info.status.value if gamestate.info.status else None
    phase = gamestate.info.current_phase.value if gamestate.info.current_phase else None
    end_cause = gamestate.info.end_cause.value if gamestate.info.end_cause else None

    cursor.execute(
        t"""
        UPDATE partie
        SET 
            status = {status},
            aktuelle_runde = {gamestate.info.current_round},
            aktuelle_phase = {phase},
            aktuelle_reihenfolge = {gamestate.active_player},
            gewinner = {winner},
            ende_grund = {end_cause}
        WHERE id = {gamestate.info.room_id};
        """
    )


def get_map_id(cursor: Cursor, game_id: int) -> int:
    row = cursor.execute(
        t"""
        SELECT id_karte
        FROM partie
        WHERE partie.id = {game_id};
        """
    ).fetchone()

    map_id = row[0] if row else None

    assert map_id is not None, f"No map ID found for game id {game_id}"

    return map_id


def get_map_nodes(cursor: Cursor, map_id: int) -> list[MapNode]:
    rows = cursor.execute(
        t"""
        SELECT knoten.id, nummer, position_x, position_y
        FROM knoten
        WHERE knoten.id_karte = {map_id};
        """
    ).fetchall()

    nodes = [
        MapNode(
            node_id=node_id,
            number=number,
            position_x=pos_x,
            position_y=pos_y,
        )
        for (node_id, number, pos_x, pos_y) in rows
    ]

    assert len(nodes) != 0, f"No map nodes found for map id {map_id}"

    return nodes


def get_map_connections(cursor, map_id) -> list[Connection]:
    rows = cursor.execute(
        t"""
        SELECT v.id, v.id_startknoten, v.id_zielknoten, v.id_verkehrsmittel
        FROM knoten
        JOIN verbindung AS v ON knoten.id = v.id_startknoten
        WHERE knoten.id_karte = {map_id};
        """
    ).fetchall()

    connections = [
        Connection(
            connection_id=cid,
            from_node_id=from_node,
            to_node_id=to_node,
            vehicle_id=vehicle,
        )
        for (cid, from_node, to_node, vehicle) in rows
    ]

    return connections


def get_player_infos(
    cursor: Cursor, game_id: int, player_ids: list[int] | None = None
) -> list[Player]:
    rows = cursor.execute(
        t"""
        WITH player_tickets(player_id, tickets) AS (
            SELECT 
        )

        SELECT id, benutzername, teilnehmertyp, spielerrolle, id_aktueller_knoten, teilnehmertyp, aktiv, reihenfolge
        FROM teilnehmer as t
        WHERE id_partie = {self.move.game_id};
        """
    ).fetchall()

    player_ids = [
        Player(
            player_id=r[0],
            name=r[1],
            player_type=r[2],
            role=r[3],
            tickets=r[4],
            starting_node=r[5],
            current_node=r[6],
            turn_order=r[7],
        )
        for r in rows
    ]

    return player_ids
