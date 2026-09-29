# TODO: Setup automatic Python pydantic model export to TS-interfaces

from collections.abc import Sequence

from pydantic import BaseModel


class ChatMessage(BaseModel):
    sender: str
    content: str


class Gamestate(BaseModel):
    active: int
    states: Sequence[int]
    winner: int


class Move(BaseModel):
    player_id: int
    field: int


class Play(BaseModel):
    player_id: int
    role: int


class Player(BaseModel):
    player_id: int
    player_name: str


class RoleTaken(BaseModel):
    role: int
    taken: bool
