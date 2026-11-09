from dataclasses import dataclass
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
    current_round: int | None  # None for Phase.Open | Phase.Starting
    current_phase: Phase | None  # None for Phase.Open | Phase.Starting
    end_cause: EndCause | None
    players: int | None  # None for Phase.Ended


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


@dataclass(frozen=True)
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

    def get_ticket(self, ticket_type_id: int) -> Ticket | None:
        return next([t for t in self.tickets if t.ticket_type_id == ticket_type_id])

    def move(self, to_node_id: int, ticket: Ticket):
        ticket.count -= 1
        self.current_node = to_node_id


# State of an active game
class GameState(BaseModel):
    info: GameInfo
    active_player: int | None
    players: list[Player]  # Players with their respective role tickets and nodes
    nodes: list[MapNode]  # All nodes which make up the map
    connections: list[Connection]  # Connections between nodes
    vehicles: list[Vehicle]  # All used vehicles for this map

    def get_mister_x(self) -> Player:
        return next(p for p in self.players if p.role == Role.MisterX)

    def get_detectives(self) -> list[Player]:
        return [p for p in self.players if p.role == Role.Detective]

    def get_player(self, player_id: int) -> Player | None:
        return next(p for p in self.players if p.player_id == player_id)

    def get_connections(self, from_node_id: int, to_node_id: int) -> list[Connection]:
        return [
            c
            for c in self.connections
            if (c.from_node_id == from_node_id and c.to_node_id == to_node_id)
            or (c.from_node_id == to_node_id and c.to_node_id == from_node_id)
        ]

    def set_next_player_active(self):
        max_turn_order = max(
            p.turn_order for p in self.players if p.turn_order is not None
        )

        if self.active_player == max_turn_order:
            self.info.current_round += 1
            self.active_player = 1
        else:
            self.active_player += 1

    def player_can_take_connection(
        self, conn: Connection, player: Player, selected_ticket: Ticket | None,
    ) -> Ticket | None:
        dst = (
            conn.from_node_id
            if player.current_node == conn.to_node_id
            else conn.to_node_id
        )

        dst_open = all(
            p.current_node != dst
            or (p.role == Role.MisterX and player.role == Role.Detective)
            for p in self.players
        )

        legal_tickets = [
            t
            for t in player.tickets
            if (conn.vehicle_id in [v.vehicle_id for v in t.allowed_vehicles])
            and (t.count > 0)
        ]

        if selected_ticket is None:
            valid_ticket = next(
                iter(sorted(legal_tickets, key=lambda t: t.count, reverse=True))
            )
        else:
            valid_ticket = selected_ticket if selected_ticket in legal_tickets else None

        if dst_open and valid_ticket is not None:
            return valid_ticket
        else:
            return None

    # Gets all legal moves per player as a dict indexed by player ID
    def get_legal_moves_per_player(self) -> dict:
        return {
            p.player_id: GameState.filter_player_pos(
                GameState.reverse_conns(
                    GameState.get_ticket_connections(self.connections, p), p
                ),
                self.players,
            )
            for p in self.players
        }

    # Filter available connections based on held tickets
    def get_ticket_connections(
        conns: list[Connection], player: Player
    ) -> list[Connection]:
        player_vehicles = {
            v.vehicle_id for t in player.tickets for v in t.allowed_vehicles
        }
        return [
            c
            for c in conns
            if c.vehicle_id in player_vehicles
            and (  # connections starts from or points to player.current_node
                c.from_node_id == player.current_node
                or c.to_node_id == player.current_node
            )
        ]

    # Reverse connection pointing towards instead of away from player.current_node
    def reverse_conns(conns: list[Connection], player: Player) -> list[Connection]:
        return [
            Connection(
                connection_id=c.connection_id,
                vehicle_id=c.vehicle_id,
                from_node_id=c.from_node_id
                if c.from_node_id == player.current_node
                else c.to_node_id,
                to_node_id=c.to_node_id
                if c.from_node_id == player.current_node
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


class Move(BaseModel):
    player_id: int
    game_id: int
    from_node: int
    to_node: int
    ticket: Ticket | None


class StartGame(BaseModel):
    player_id: int
    game_id: int


class ChooseRole(BaseModel):
    player_id: int
    game_id: int
    role: Role | None
