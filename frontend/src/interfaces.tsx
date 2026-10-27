// Generated from a Pydantic-SocketIO AsyncAPI contract. Do not edit.
// Client: Socket<ServerToClientEvents, ClientToServerEvents>.
// Server: Server<ClientToServerEvents, ServerToClientEvents> for /; Namespace<...> for other paths.
export type Status = "lobby" | "laufend" | "beendet" | "abgebrochen";
export type Phase = "mister_x" | "detektive";
export type Role = "mister_x" | "detektiv";
export type Tickets = Ticket[];
export type Players = Player[];
export type Nodes = MapNode[];
export type Connections = Connection[];
export type Vehicles = Vehicle[];
export type RootLobbyPayloadArgument1 = GameInfo[];

export interface ChatMessage {
  sender: string;
  content: string;
}
export interface Connection {
  from_node: number;
  to_node: number;
  vehicle: number;
}
export interface GameInfo {
  room_code: string;
  creator_name: string;
  map_name: string;
  map_dimensions: number[];
  status: Status;
  players: number | null;
  current_round: number | null;
  current_phase: Phase | null;
  started_timestamp: number;
  ended_timestamp: number | null;
}
export interface GameState {
  info: GameInfo;
  active_player: string;
  turn_order: string[];
  players: Players;
  nodes: Nodes;
  connections: Connections;
  vehicles: Vehicles;
}
export interface Player {
  name: string;
  role: Role | null;
  tickets: Tickets;
  starting_node: number | null;
  current_node: number | null;
}
export interface Ticket {
  count: number;
}
export interface MapNode {
  index: number;
  position_x: number;
  position_y: number;
}
export interface Vehicle {
  name: string;
}
export namespace Root {
  export const path = "/";
  export interface ClientToServerEvents {
    "chat": (...args: [...[message: ChatMessage], ack?: (...args: unknown[]) => void]) => void;
    "get_gamestate": (...args: [...[], ack?: (...args: unknown[]) => void]) => void;
    "get_lobby": (...args: [...[], ack?: (...args: unknown[]) => void]) => void;
    "login": (...args: [...[player_name: string], ack?: (...args: unknown[]) => void]) => void;
    "logout": (...args: [...[player_id: number], ack?: (...args: unknown[]) => void]) => void;
  }
  export interface ServerToClientEvents {
    "gamestate": (...args: [...[GameState], ack?: (...args: unknown[]) => void]) => void;
    "lobby": (...args: [...[RootLobbyPayloadArgument1], ack?: (...args: unknown[]) => void]) => void;
  }
}
