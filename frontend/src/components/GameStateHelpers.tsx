import type { GameState, Player, Connection, Ticket, Vehicle, MapNode } from "../interfaces";
import { NodeState } from "./NodeState";

export function getPlayer(gamestate: GameState, player_id: number): Player | undefined {
    return gamestate.players.find(player => player.player_id === player_id)
}

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

export function getConnection(gamestate: GameState, from_node_id: number, to_node_id: number): Connection | undefined {
    const connections: Connection[] = gamestate.connections
        .filter(conn => conn.from_node_id === from_node_id || conn.to_node_id === from_node_id)
        .map(conn => {
            if (conn.from_node_id === from_node_id) { return conn } else {
                return {
                    connection_id: conn.connection_id,
                    from_node_id: conn.to_node_id,
                    to_node_id: conn.from_node_id,
                    vehicle_id: conn.vehicle_id
                }
            }
        });

    return connections.find(conn => conn.to_node_id === to_node_id);
}

export function getNode(gamestate: GameState, node_id: number): MapNode | undefined {
    return gamestate.nodes.find(node => node.node_id === node_id)
}

export function getVehicle(gamestate: GameState, vehicle_id: number): Vehicle | undefined {
    return gamestate.vehicles.find(vehicle => vehicle.vehicle_id === vehicle_id)
}

export function getLegalTicketsForVehicle(player: Player, vehicle_id: number): Ticket[] | undefined {
    return player.tickets.filter(ticket =>
        ticket.count > 0 &&
        ticket.allowed_vehicles.flatMap(av => av.vehicle_id).includes(vehicle_id)
    )
}

export function getNodeStates(new_gamestate: GameState): NodeState[] {
    const active_player = getActivePlayer(new_gamestate);
    if (!active_player || !active_player.current_node) {
        return [];
    }

    const current_node = getNode(new_gamestate, active_player.current_node);
    if (!current_node) {
        return []; // Spectators have no valid target nodes
    }

    const player_positions = new_gamestate.players.map(player => player.current_node);
    const misterX_pos = new_gamestate.players.find(player => player.role === "mister_x")?.current_node;

    console.log(`Connections for ${active_player.name}`);
    const new_node_states: NodeState[] = new_gamestate.nodes.map((node, _node_id) => {
        if (node.node_id === current_node.node_id) {
            return NodeState.Current;
        }

        const conn = getConnection(new_gamestate, current_node.node_id, node.node_id);

        if (!conn) {
            return NodeState.IllegalDst;
        }

        const legal_tickets = getLegalTicketsForVehicle(active_player, conn.vehicle_id) ?? [];
        const hasTicket = legal_tickets.length > 0;
        if (!hasTicket) {
            return NodeState.IllegalDst;
        }

        const occupied = player_positions.includes(node.node_id);
        const isMisterXPos = misterX_pos === node.node_id;

        let state: NodeState;
        if ((!occupied && conn) || (isMisterXPos && conn)) { state = NodeState.LegalDst } else { state = NodeState.IllegalDst }

        const vehicle_name = getVehicle(new_gamestate, conn.vehicle_id)?.name ?? "Unknown";
        if (state === NodeState.LegalDst) {
            console.log(`From ${current_node} to ${node.number} via ${vehicle_name}`);
        }

        return state;
    });

    return new_node_states;
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