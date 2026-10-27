from enum import Enum

from pydantic import BaseModel


class ChatMessage(BaseModel):
    sender: str
    content: str


class Status(Enum):
    Open = "lobby"
    InProgress = "laufend"
    Ended = "beendet"
    Aborted = "abgebrochen"


class Phase(Enum):
    MisterX = "mister_x"
    Detectives = "detektive"


class Role(Enum):
    MisterX = "mister_x"
    Detective = "detektiv"


# Advertised game in main lobby
class GameInfo(BaseModel):
    room_code: str
    creator_name: str
    map_name: str
    map_dimensions: list[int]
    status: Status
    players: int | None  # None for Phase.Ended
    current_round: int | None  # None for Phase.Open | Phase.Starting
    current_phase: Phase | None  # None for Phase.Open | Phase.Starting
    started_timestamp: int  # Unix epoch timestamp in milliseconds
    ended_timestamp: (
        int | None
    )  # Unix epoch timestamp in milliseconds; None for active game


class MapNode(BaseModel):
    index: int
    position_x: int
    position_y: int


class Connection(BaseModel):
    from_node: int
    to_node: int
    vehicle: int


class Vehicle(BaseModel):
    name: str


class Ticket(BaseModel):
    count: int


class Player(BaseModel):
    name: str
    role: Role | None  # None for spectators
    tickets: list[Ticket]  # Remaining tickets per vehicle; empty for spectators
    starting_node: int | None  # None for spectators
    current_node: int | None  # None for spectators


# State of an active game transmitted as response to on_enter
class GameState(BaseModel):
    info: GameInfo
    active_player: str
    turn_order: list[str]
    players: list[
        Player
    ]  # Players with their respective role tickets and nodes; Index 0: Me
    nodes: list[MapNode]  # All nodes which make up the map
    connections: list[Connection]  # Connections between nodes
    vehicles: list[Vehicle]  # All used vehicles for this map
