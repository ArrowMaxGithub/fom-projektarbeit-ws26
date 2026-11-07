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

def get_player_name(cursor: Cursor, player_id: int) -> str | None:
    row = cursor.execute(
        t"""
        SELECT b.benutzername
        FROM benutzer as b 
        WHERE b.id = {player_id}; 
        """
    ).fetchone()

    player_name = row[0] if row else None

    return player_name

def get_lobby_rooms(cursor: Cursor) -> list[GameInfo]:
    rows = cursor.execute(
        t"""
        WITH anzahl_teilnehmer(id_partie, anzahl) AS (
            SELECT t.id_partie, COUNT(t.id)
            FROM teilnehmer as t
            GROUP BY t.id_partie
        )

        SELECT p.id, b.benutzername, k.name, k.breite, k.hoehe, p.status, p.ende_grund, COALESCE(t.anzahl, 0), p.aktuelle_runde, p.aktuelle_phase
        FROM partie AS p
        JOIN karte AS k ON k.id = id_karte
        JOIN benutzer AS b ON p.id_benutzer = b.id
        LEFT JOIN anzahl_teilnehmer AS t ON t.id_partie = p.id
        ORDER BY p.id DESC;
        """
    ).fetchall()

    rooms = [GameInfo(
        room_id=r[0],
        creator_name=r[1],
        map_name=r[2],
        map_dimensions=[r[3], r[4]],
        status=r[5],
        end_cause=r[6],
        players=r[7],
        current_round=r[8],
        current_phase=r[9],
    ) for r in rows]

    return rooms
