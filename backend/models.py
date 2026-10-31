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


class EndCause(Enum):
    MisterXCaught = "gefangen"
    MisterXBlocked = "mr_x_blockiert"
    MisterXEscaped = "mr_x_entkommen"
    DetectivesBlocked = "detektive_blockiert"


class Phase(Enum):
    MisterX = "mister_x"
    Detectives = "detektive"


class Role(Enum):
    MisterX = "mister_x"
    Detective = "detektiv"


# Advertised game in main lobby
class GameInfo(BaseModel):
    room_id: int
    creator_name: str
    map_name: str
    map_dimensions: list[int]
    status: Status
    end_cause: EndCause | None
    players: int | None  # None for Phase.Ended
    current_round: int | None  # None for Phase.Open | Phase.Starting
    current_phase: Phase | None  # None for Phase.Open | Phase.Starting


class MapNode(BaseModel):
    node_id: int
    number: int
    position_x: int
    position_y: int


class Connection(BaseModel):
    connection_id: int
    from_node_id: int
    to_node_id: int
    vehicle_id: int


class Vehicle(BaseModel):
    vehicle_id: int
    name: str


class Ticket(BaseModel):
    ticket_type_id: int
    name: str
    count: int
    allowed_vehicles: list[Vehicle]


class Player(BaseModel):
    player_id: int
    name: str
    role: Role | None  # None for spectators
    tickets: list[Ticket]  # Remaining tickets per vehicle; empty for spectators
    starting_node: int | None  # None for spectators
    current_node: int | None  # None for spectators
    turn_order: int | None  # None for spectators


# State of an active game transmitted as response to on_enter
class GameState(BaseModel):
    info: GameInfo
    active_player: int
    players: list[Player]  # Players with their respective role tickets and nodes
    nodes: list[MapNode]  # All nodes which make up the map
    connections: list[Connection]  # Connections between nodes
    vehicles: list[Vehicle]  # All used vehicles for this map


class Move(BaseModel):
    player_id: int
    game_id: int
    from_node: int
    to_node: int
    ticket_type: int


class StartGame(BaseModel):
    player_id: int
    game_id: int


class ChooseRole(BaseModel):
    player_id: int
    game_id: int
    role: Role
