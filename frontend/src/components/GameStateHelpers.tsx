import type { GameState, Player, Connection, Ticket, Vehicle, MapNode } from "../interfaces";
import { NodeState } from "./NodeState";

interface KeyDict {
    [key: number]: number;
}

export function repopulateIds(gamestate: GameState): GameState {
    const nodeMapping: KeyDict = {};
    gamestate.nodes.forEach((n, index) => {
        nodeMapping[n.node_id] = index + 1;
    })

    const connMapping: KeyDict = {};
    gamestate.connections.forEach((c, index) => {
        connMapping[c.connection_id] = index + 1;
    })

    return {
        ...gamestate,
        nodes: gamestate.nodes.map(n => {
            return {
                ...n,
                number: nodeMapping[n.node_id],
                node_id: nodeMapping[n.node_id],
            }
        }),
        connections: gamestate.connections.map(c => {
            return {
                ...c,
                connection_id: connMapping[c.connection_id],
                from_node_id: nodeMapping[c.from_node_id],
                via: c.via.map(v => nodeMapping[v]),
                to_node_id: nodeMapping[c.to_node_id],
            }
        }),
    };
}

// TODO: Brittle comparison against vehicle name. Add vehicle color to database or user preferences.
export function vehicleNameToColor(vehicle_name: string): string {
    switch (vehicle_name) {
        case "U-Bahn":
            return "#a40000";
        case "Taxi":
            return "#ffd000";
        case "Bus":
            return "#039c03";
        case "Schwarze Route":
            return "#373737";
        default:
            return "#ffffff";
    }
}

export function getVehiclesAtNode(gamestate: GameState | null, node_id: number | null): number[] | undefined {
    return [... new Set(gamestate?.connections.filter(conn => conn.from_node_id === node_id || conn.to_node_id === node_id).map(conn => conn.vehicle_id).sort((a, b) => a - b))]
}

export function getPlayerPerspective(gamestate: GameState | null, player_id: number | null): number | null {
    const active_player = getActivePlayer(gamestate);
    const player = getPlayer(gamestate, player_id);

    let perspective;
    if (player?.player_type === "zuschauer") {
        perspective = null;
    }
    else if (active_player?.player_type === "bobby" && player?.role === "detektiv") {
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
                    vehicle_id: conn.vehicle_id,
                    via: conn.via
                }
            }
        });

    return connections.filter(conn => conn.to_node_id === to_node_id);
}

export function getNode(gamestate: GameState | null, node_id: number | null): MapNode | undefined {
    return gamestate?.nodes.find(node => node.node_id === node_id)
}

export function getNextNodeId(gamestate: GameState): number {
    let next = 0;
    gamestate.nodes.forEach(n => next = Math.max(next, n.node_id));
    return next + 1;
}

export function getConnection(gamestate: GameState | null, conn_id: number | null): Connection | undefined {
    return gamestate?.connections.find(conn => conn.connection_id === conn_id)
}

export function getNextConnectionId(gamestate: GameState): number {
    let next = 0;
    gamestate.connections.forEach(c => next = Math.max(next, c.connection_id));
    return next + 1;
}

export function getVehicle(gamestate: GameState | null, vehicle_id: number): Vehicle | undefined {
    return gamestate?.vehicles.find(vehicle => vehicle.vehicle_id === vehicle_id)
}

export function getVehicleByName(gamestate: GameState | null, vehicle_name: string): Vehicle | undefined {
    return gamestate?.vehicles.find(vehicle => vehicle.name === vehicle_name)
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

export function isOverlappingConnection(gamestate: GameState, conn: Connection): number[] {
    const nodes = [conn.from_node_id, ...conn.via, conn.to_node_id];
    const vehicle = conn.vehicle_id;

    for (let k = 0; k < gamestate.connections.length; k += 1) {
        const c = gamestate.connections[k];
        if (!c) continue;
        const other_nodes = [c.from_node_id, ...c.via, c.to_node_id];

        for (let i = 0; i < other_nodes.length - 1; i += 1) {
            const other_from = other_nodes[i];
            const other_to = other_nodes[i + 1];
            const other_vehicle = c.vehicle_id;

            if (vehicle !== other_vehicle || conn.connection_id === c.connection_id) {
                continue;
            }

            for (let j = 0; j < nodes.length - 1; j += 1) {
                const from = nodes[j];
                const to = nodes[j + 1];

                if (
                    (from === other_from && to === other_to) ||
                    (to === other_from && from === other_to)
                ) {
                    return [from, to];
                }
            }
        }
    };

    return [];
}