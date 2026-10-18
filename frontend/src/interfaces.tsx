// Generated from a Pydantic-SocketIO AsyncAPI contract. Do not edit.
// Client: Socket<ServerToClientEvents, ClientToServerEvents>.
// Server: Server<ClientToServerEvents, ServerToClientEvents> for /; Namespace<...> for other paths.
export interface ChatMessage {
  sender: string;
  content: string;
}
export interface Player {
  player_id: number;
  player_name: string;
}
export namespace Root {
  export const path = "/";
  export interface ClientToServerEvents {
    "chat": (...args: [...[message: ChatMessage], ack?: (...args: unknown[]) => void]) => void;
    "join": (...args: [...[player: Player], ack?: (...args: unknown[]) => void]) => void;
    "leave": (...args: [...[player: Player], ack?: (...args: unknown[]) => void]) => void;
  }
  export interface ServerToClientEvents {
  }
}
