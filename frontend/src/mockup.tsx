// Advertised game in main lobby
export type GameInfo = {
    room_code: string,
    creator_name: string,
    map_name: string,
    status: Status,
    players: number | null, // null for Phase.Ended
    current_round: number | null, // null for Phase.Open | Phase.Starting
    current_phase: Phase | null, // null for Phase.Open | Phase.Starting
    started_timestamp: number, // Unix epoch timestamp in milliseconds
    ended_timestamp: number | null, // Unix epoch timestamp in milliseconds; null for active game
}

export enum Status {
    Open = 0, // Waiting for creator to start game; Other players may join
    Starting, // Creator started the game; Countdown until start
    InPlay,
    Ended,
}

export function status_to_label(status: Status): string {
    let label;
    switch (status) {
        case Status.Open:
            label = "✅ Offen"
            break;

        case Status.Starting:
            label = "⌛ Startet"
            break;

        case Status.InPlay:
            label = "🎲 Im Spiel"
            break;

        case Status.Ended:
            label = "🏁 Beendet"
            break;
    }
    return label;
}

export enum Phase {
    MisterX = 0, // Mister X submits move
    Detectives, // Detectives submite moves
    PhaseEnd, // All moves are made on the board
}

// State of an active game, transmitted as response to on_enter
export interface GameState {
    info: GameInfo,
    players: Player[], // Players with their respective role, tickets and nodes; Index 0: Me
    nodes: MapNode[], // All nodes which make up the map
    connections: Connection[], // Connections between nodes
    vehicles: Vehicle[], // All used vehicles for this map
}

export interface Player {
    name: string,
    role: Role,
    tickets: Ticket[], // Remaining tickets per vehicle; empty for spectators 
    starting_node: number | null, // null for spectators
    current_node: number | null, // null for spectators
}

export enum Role {
    MisterX,
    Detective,
    Spectator,
}

export interface MapNode {
    index: number,
    position_x: number,
    position_y: number,
}

export interface Connection {
    from: number,
    to: number,
    vehicle: number,
}

export interface Vehicle {
    name: string,
}

export interface Ticket {
    vehicle: number,
    count: number,
}

export function mockup_open_game(): GameInfo {
    const info: GameInfo = {
        room_code: "Raum A",
        creator_name: "Markus",
        map_name: "Berlin",
        status: Status.Open,
        players: 2,
        current_round: null,
        current_phase: null,
        started_timestamp: 1792334940123,
        ended_timestamp: null,
    }

    return info;
}

export function mockup_starting_game(): GameInfo {
    const info: GameInfo = {
        room_code: "Raum B",
        creator_name: "Matthias",
        map_name: "Stuttgart",
        status: Status.Starting,
        players: 4,
        current_round: null,
        current_phase: null,
        started_timestamp: 1792334980123,
        ended_timestamp: null,
    }

    return info;
}

export function mockup_inplay_game(): GameInfo {
    const info: GameInfo = {
        room_code: "Raum C",
        creator_name: "Gustav",
        map_name: "München",
        status: Status.InPlay,
        players: 6,
        current_round: 4,
        current_phase: Phase.Detectives,
        started_timestamp: 1792336000123,
        ended_timestamp: null,
    }

    return info;
}

export function mockup_ended_game(): GameInfo {
    const info: GameInfo = {
        room_code: "Raum D",
        creator_name: "Leon",
        map_name: "Düsseldorf",
        status: Status.Ended,
        players: null,
        current_round: 22,
        current_phase: Phase.PhaseEnd,
        started_timestamp: 1792336000123,
        ended_timestamp: 1792334910123,
    }

    return info;
}

export function mockup_game_lobby(): GameInfo[] {
    const open_game = mockup_open_game();
    const starting_game = mockup_starting_game();
    const inplay_game = mockup_inplay_game();
    const ended_game = mockup_ended_game();

    return [open_game, starting_game, inplay_game, ended_game];
}

export function mockup_active_gamestate(role: Role): GameState {
    const info = mockup_inplay_game();

    var tickets: Ticket[] = [];
    var starting_node = null;
    var current_node = null;
    if (role == Role.Detective) {
        tickets = [{ vehicle: 0, count: 12 }, { vehicle: 1, count: 4 }, { vehicle: 2, count: 3 }, { vehicle: 3, count: 5 }];
        starting_node = 3;
        current_node = 3;
    }

    const john: Player = {
        name: "John",
        role,
        tickets,
        starting_node,
        current_node,
    };
    const gustav: Player = {
        name: "Gustav",
        role: Role.MisterX,
        tickets: [{ vehicle: 0, count: 12 }, { vehicle: 1, count: 4 }, { vehicle: 2, count: 3 }, { vehicle: 3, count: 5 }],
        starting_node: 0,
        current_node: 5,
    };
    const louis: Player = {
        name: "Louis",
        role: Role.Detective,
        tickets: [{ vehicle: 0, count: 10 }, { vehicle: 1, count: 2 }, { vehicle: 2, count: 2 }],
        starting_node: 3,
        current_node: 4,
    };
    const viktor: Player = {
        name: "Viktor",
        role: Role.Spectator,
        tickets: [],
        starting_node: null,
        current_node: null,
    };
    const players: Player[] = [john, gustav, louis, viktor];

    const nodes: MapNode[] = [
        { index: 0, position_x: 10.0, position_y: 40.0 },
        { index: 1, position_x: 50.0, position_y: 10.0 },
        { index: 2, position_x: 90.0, position_y: 40.0 },
        { index: 3, position_x: 90.0, position_y: 90.0 },
        { index: 4, position_x: 10.0, position_y: 90.0 },
        { index: 5, position_x: 50.0, position_y: 65.0 },
    ];

    const vehicles: Vehicle[] = [
        { name: "Taxi" },
        { name: "Bus" },
        { name: "Subway" },
        { name: "Black Route" },
    ];

    const connections: Connection[] = [
        // Taxi 
        { from: 0, to: 1, vehicle: 0 },
        { from: 0, to: 4, vehicle: 0 },
        { from: 0, to: 5, vehicle: 0 },
        { from: 1, to: 2, vehicle: 0 },
        { from: 2, to: 3, vehicle: 0 },
        { from: 2, to: 5, vehicle: 0 },
        { from: 3, to: 4, vehicle: 0 },
        { from: 3, to: 5, vehicle: 0 },
        { from: 4, to: 5, vehicle: 0 },

        // Bus
        { from: 0, to: 3, vehicle: 1 },
        { from: 2, to: 4, vehicle: 1 },

        // Subway
        { from: 1, to: 3, vehicle: 2 },
        { from: 1, to: 4, vehicle: 2 },
        { from: 3, to: 4, vehicle: 2 },

        // Black route
        { from: 0, to: 2, vehicle: 3 },
    ];

    const gamestate: GameState = {
        info,
        players,
        nodes,
        vehicles,
        connections,
    };

    return gamestate
}