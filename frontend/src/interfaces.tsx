// TODO: Setup automatic Python pydantic model export to TS-interfaces

export interface ChatMessage {
    sender: string,
    content: string,
}

export interface Gamestate {
    active: number,
    states: number[],
    winner: number | null,
}

export interface Move {
    player_id: number,
    field: number,
}

export interface Play {
    player_id: number,
    role: number,
}

export interface Player {
    player_id: number,
    player_name: string,
}

export interface RoleTaken {
    role: number,
    taken: boolean,
}