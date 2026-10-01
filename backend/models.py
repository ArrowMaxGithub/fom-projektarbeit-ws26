# TODO: Setup automatic Python pydantic model export to TypeScript-interfaces

from pydantic import BaseModel


class Player(BaseModel):
    player_id: int
    player_name: str


class ChatMessage(BaseModel):
    sender: str
    content: str
