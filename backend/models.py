from pydantic import BaseModel


class Player(BaseModel):
    player_id: int
    player_name: str


class ChatMessage(BaseModel):
    sender: str
    content: str
