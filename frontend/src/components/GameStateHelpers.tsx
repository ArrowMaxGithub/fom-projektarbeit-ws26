import type { GameState, Player, Connection } from "../interfaces";
import { NodeState } from "./NodeState";

export function getActivePlayerIndex(gamestate: GameState): number {
    return gamestate.players.findIndex(player => player.name === gamestate.active_player)
}

export function getActivePlayer(gamestate: GameState | null): Player | undefined {
    return gamestate?.players.find(player => player.name === gamestate?.active_player)
}

export function getPlayerAt(gamestate: GameState, node_index: number): Player | undefined {
    return gamestate?.players.find(player => player.current_node === node_index)
}

export function getMisterX(gamestate: GameState | null): Player | undefined {
    return gamestate?.players.find(player => player.role === "mister_x");
}

export function getDetectives(gamestate: GameState | null): Player[] | undefined {
    return gamestate?.players.filter(player => player.role === "detektiv");
}

export function getConnection(gamestate: GameState, from: number, to: number): Connection | undefined {
    const connections: Connection[] = gamestate.connections
        .filter(conn => conn.from_node === from || conn.to_node === from)
        .map(conn => { if (conn.from_node === from) { return conn } else { return { from_node: conn.to_node, to_node: conn.from_node, vehicle: conn.vehicle } } });

    return connections.find(conn => conn.to_node === to);
}

export function getNodeStates(new_gamestate: GameState): NodeState[] {
    const active_player = getActivePlayer(new_gamestate);
    if (!active_player) {
        return [];
    }

    const current_node = active_player.current_node;
    const player_positions = new_gamestate.players.map(player => player.current_node);
    const misterX_pos = new_gamestate.players.find(player => player.role === "mister_x")?.current_node;

    console.log(`Connections for ${active_player.name}`);
    const new_node_states: NodeState[] = new_gamestate.nodes.map((node, _index) => {
        if (current_node === null) {
            return NodeState.IllegalDst; // Spectators have no valid target nodes
        }

        if (node.index === current_node) {
            return NodeState.Current;
        }

        const conn = getConnection(new_gamestate, current_node, node.index);

        if (!conn) {
            return NodeState.IllegalDst;
        }

        const hasTicket = active_player.tickets[conn.vehicle].count > 0;
        if (!hasTicket) {
            return NodeState.IllegalDst;
        }

        const occupied = player_positions.includes(node.index);
        const isMisterXPos = misterX_pos === node.index;

        let state: NodeState;
        if ((!occupied && conn) || (isMisterXPos && conn)) { state = NodeState.LegalDst } else { state = NodeState.IllegalDst }

        if (state === NodeState.LegalDst) {
            console.log(`From ${current_node} to ${node.index} via ${conn ? new_gamestate.vehicles[conn.vehicle].name : "None"}`);
        }

        return state;
    });

    return new_node_states;
}

export function setNextActivePlayer(gamestate: GameState): boolean {
    const active_player_index = getActivePlayerIndex(gamestate);
    const next_active_player_index = (active_player_index + 1) % gamestate.turn_order.length;
    const active_player_role = gamestate.players[next_active_player_index].role;
    const new_round = active_player_role === "mister_x";

    gamestate.active_player = gamestate.players[next_active_player_index].name;

    console.log();
    console.log(`Next Player: ${gamestate.active_player}`);
    return new_round;
}

export function moveActivePlayer(gamestate: GameState, to: number): boolean {
    const active_player = getActivePlayer(gamestate);
    const active_player_name = active_player?.name;
    const active_player_role = active_player?.role;
    const active_player_index = getActivePlayerIndex(gamestate);

    const from = gamestate.players[active_player_index].current_node;
    if (from === null) {
        return false;
    }

    const conn = getConnection(gamestate, from, to);
    if (!conn) {
        console.error(`Invalid move from ${from} to ${to}`);
        return false;
    }

    console.log(`${active_player_name} moves to ${to} via ${gamestate.vehicles[conn.vehicle].name}`);
    gamestate.players[active_player_index].tickets[conn.vehicle].count -= 1;
    gamestate.players[active_player_index].current_node = to;

    const misterX = getMisterX(gamestate);
    if (!misterX) {
        return false;
    }

    return (active_player_role === "detektiv" && to === misterX.current_node);
}

export function isGameAborted(gamestate: GameState): boolean {
    return gamestate.info.status === "abgebrochen"
}

export function isGameEnded(gamestate: GameState): boolean {
    return gamestate.info.status === "beendet"
}

export function isGameOver(gamestate: GameState): boolean {
    return gamestate.info.status === "beendet" || gamestate.info.status === "abgebrochen"
}