import type { GameState, Player, Connection, Ticket, Vehicle, MapNode } from "../interfaces";
import { NodeState } from "./NodeState";

export function getPlayerPerspective(gamestate: GameState, player_id: number | null): number | null{
    const active_player = getActivePlayer(gamestate);
    const player = getPlayer(gamestate, player_id);

    let perspective;
    if (player?.player_type === "zuschauer"){
        perspective = null;
    }
    else if (active_player?.player_type === "bobby" && player?.role === "detektiv"){
        perspective = active_player?.player_id;
    }
    else {
        perspective = player_id;
    }

    return perspective;
}

export function getPlayer(gamestate: GameState | null, player_id: number | null): Player | undefined {
    return gamestate?.players.find(player => player.player_id === player_id)
}

export function getActivePlayerIndex(gamestate: GameState): number {
    return gamestate.players.findIndex(player => player.turn_order === gamestate.active_player)
}

export function getActivePlayer(gamestate: GameState | null): Player | undefined {
    if (gamestate?.active_player === null) return undefined;
    return gamestate?.players.find(player => player.turn_order === gamestate?.active_player)
}

export function getPlayersAt(gamestate: GameState, node_index: number): Player[] {
    return gamestate?.players.filter(player => player.current_node === node_index)
}

export function getMisterX(gamestate: GameState | null): Player | undefined {
    return gamestate?.players.find(player => player.role === "mister_x");
}

export function getDetectives(gamestate: GameState | null): Player[] | undefined {
    return gamestate?.players.filter(player => player.role === "detektiv");
}

export function getTurnOrderLabels(gamestate: GameState | null): string[] | undefined {
    return gamestate?.players
        .filter(p => p.turn_order !== null)
        .sort((a, b) => (a.turn_order ?? 0) - (b.turn_order ?? 0))
        .map(p => p.name);
}

export function getConnections(gamestate: GameState, from_node_id: number, to_node_id: number): Connection[] | undefined {
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

    return connections.filter(conn => conn.to_node_id === to_node_id);
}

export function getNode(gamestate: GameState, node_id: number | null): MapNode | undefined {
    return gamestate.nodes.find(node => node.node_id === node_id)
}

export function getVehicle(gamestate: GameState, vehicle_id: number): Vehicle | undefined {
    return gamestate.vehicles.find(vehicle => vehicle.vehicle_id === vehicle_id)
}

export function getLegalTicketsForVehicle(player: Player, vehicle_id: number): Ticket[] | undefined {
    return player.tickets.filter(ticket =>
        ticket.count > 0 &&
        (
            ticket.allowed_vehicles.length == 0 ||
            ticket.allowed_vehicles.flatMap(av => av.vehicle_id).includes(vehicle_id)
        )
    )
}

export function getNodeStates(playerId: number | null, new_gamestate: GameState, selectedTicket: Ticket | null): NodeState[] {
    const player = getPlayer(new_gamestate, playerId);
    if (!player) {
        return [];
    }

    const current_node = getNode(new_gamestate, player.current_node);
    if (!current_node) {
        return []; // Spectators have no valid target nodes
    }

    const detective_positions = new_gamestate.players.filter(player => player.role == "detektiv").map(player => player.current_node);

    console.log(`Connections for ${player.name}`);
    let new_node_states: NodeState[] = new_gamestate.nodes.map((node, _index) => {
        if (node.node_id === current_node.node_id) {
            return NodeState.Current;
        }

        const conns = getConnections(new_gamestate, current_node.node_id, node.node_id);

        if (!conns) {
            return NodeState.IllegalDst;
        }

        const legal_conns = conns.filter(conn => {
            const legal_tickets = getLegalTicketsForVehicle(player, conn.vehicle_id)?.filter(ticket => selectedTicket !== null ? ticket === selectedTicket : true) ?? [];
            const hasTicket = legal_tickets.length > 0 || player.player_type == "bobby";
            if (hasTicket) {
                return conn;
            } else {
                return null;
            }
        })

        if (legal_conns.length == 0) return NodeState.IllegalDst;

        const occupied = detective_positions.includes(node.node_id);

        let state: NodeState;
        if (!occupied) { state = NodeState.LegalDst } else { state = NodeState.IllegalDst }

        legal_conns.forEach(conn => {
            const vehicle_name = getVehicle(new_gamestate, conn.vehicle_id)?.name ?? "Unknown";
            if (state === NodeState.LegalDst) {
                console.log(`From ${current_node.node_id} to ${node.number} via ${vehicle_name}`);
            }
        })

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